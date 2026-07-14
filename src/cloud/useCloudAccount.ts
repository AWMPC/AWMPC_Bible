import { useCallback, useEffect, useRef, useState } from "react";
import { readFirebaseClientConfig } from "./config";
import type { CloudAccountState, CloudGateway, CloudSnapshot } from "./contracts";
import { createFirebaseGateway } from "./firebaseGateway";
import { reconcileConcurrentHydration } from "./migration";

const OWNER_KEY = "awmpc-bible.cloud-owner.v1";

type CloudAccountOptions = Readonly<{
  snapshot: CloudSnapshot;
  defaults: CloudSnapshot;
  apply: (snapshot: CloudSnapshot) => void;
}>;

export function useCloudAccount({ snapshot, defaults, apply }: CloudAccountOptions) {
  const gatewayRef = useRef<CloudGateway | null>(null);
  const snapshotRef = useRef(snapshot);
  const applyRef = useRef(apply);
  const defaultsRef = useRef(defaults);
  const readyUidRef = useRef<string | null>(null);
  const lastSavedRef = useRef("");
  const operationRef = useRef<AbortController | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [state, setState] = useState<CloudAccountState>({ status: "loading", user: null });
  snapshotRef.current = snapshot;
  applyRef.current = apply;
  defaultsRef.current = defaults;
  const serialized = JSON.stringify(snapshot);

  useEffect(() => {
    const config = readFirebaseClientConfig();
    if (!config) {
      setState({ status: "unavailable", user: null, message: "Cloud sync is not configured for this deployment." });
      return;
    }
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void createFirebaseGateway(config).then((gateway) => {
      if (!active) return;
      gatewayRef.current = gateway;
      unsubscribe = gateway.observeAuth((user) => {
        operationRef.current?.abort();
        readyUidRef.current = null;
        if (!user) {
          let previousOwner: string | null = null;
          try { previousOwner = window.localStorage.getItem(OWNER_KEY); } catch { /* Storage is optional. */ }
          if (previousOwner) applyRef.current(defaultsRef.current);
          setState({ status: "signed-out", user: null });
          return;
        }
        const controller = new AbortController();
        operationRef.current = controller;
        let previousOwner: string | null = null;
        try { previousOwner = window.localStorage.getItem(OWNER_KEY); } catch { /* Storage is optional. */ }
        const local = previousOwner && previousOwner !== user.uid ? defaultsRef.current : snapshotRef.current;
        const localSerialized = JSON.stringify(local);
        if (previousOwner && previousOwner !== user.uid) applyRef.current(defaultsRef.current);
        setState({ status: "syncing", user });
        void gateway.hydrate(user.uid, local, controller.signal).then((hydrated) => {
          if (!active || controller.signal.aborted) return;
          const current = snapshotRef.current;
          const reconciled = JSON.stringify(current) === localSerialized ? hydrated : reconcileConcurrentHydration(local, current, hydrated);
          try { window.localStorage.setItem(OWNER_KEY, user.uid); } catch { /* Storage is optional. */ }
          lastSavedRef.current = JSON.stringify(hydrated);
          applyRef.current(reconciled);
          readyUidRef.current = user.uid;
          setState({ status: "ready", user });
        }).catch(() => {
          if (active && !controller.signal.aborted) setState({ status: "error", user, message: "Cloud sync is temporarily unavailable. Local changes remain on this device." });
        });
      });
    }).catch(() => {
      if (active) setState({ status: "error", user: null, message: "Cloud sign-in could not be initialized." });
    });
    return () => {
      active = false;
      operationRef.current?.abort();
      unsubscribe();
      gatewayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const gateway = gatewayRef.current;
    const uid = readyUidRef.current;
    if (!gateway || !uid || serialized === lastSavedRef.current) return;
    const timer = window.setTimeout(() => {
      const controller = operationRef.current;
      const pending = snapshotRef.current;
      const pendingSerialized = JSON.stringify(pending);
      if (!controller) return;
      saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(() => gateway.save(uid, pending, controller.signal)).then(() => {
        if (!controller.signal.aborted && readyUidRef.current === uid) {
          lastSavedRef.current = pendingSerialized;
          setState((current) => ({ ...current, status: "ready", message: undefined }));
        }
      }).catch(() => {
        if (!controller.signal.aborted && readyUidRef.current === uid) setState((current) => ({ ...current, status: "error", message: "Cloud sync is delayed. Local changes remain safe." }));
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [serialized]);

  const signIn = useCallback(async () => {
    const gateway = gatewayRef.current;
    if (!gateway) return;
    setState({ status: "loading", user: null });
    try { await gateway.signIn(); } catch {
      setState({ status: "signed-out", user: null, message: "Google sign-in was not completed." });
    }
  }, []);

  const signOut = useCallback(async () => {
    const gateway = gatewayRef.current;
    if (!gateway) return;
    readyUidRef.current = null;
    operationRef.current?.abort();
    await gateway.signOut().catch(() => undefined);
  }, []);

  return { state, signIn, signOut } as const;
}
