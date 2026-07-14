import { useCallback, useEffect, useRef, useState } from "react";
import { readFirebaseClientConfig } from "./config";
import type { CloudAccountState, CloudGateway, CloudSnapshot } from "./contracts";
import { createFirebaseGateway } from "./firebaseGateway";
import { reconcileConcurrentHydration } from "./migration";
import { cloudOwnerTag, loadCloudBaseline, saveCloudBaseline } from "./baseline";

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
  const baselineRef = useRef<CloudSnapshot | null>(null);
  const operationRef = useRef<AbortController | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const ownerDataHiddenRef = useRef(false);
  const retryTimerRef = useRef(0);
  const [retryGeneration, setRetryGeneration] = useState(0);
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
        window.clearTimeout(retryTimerRef.current);
        operationRef.current?.abort();
        readyUidRef.current = null;
        if (!user) {
          let previousOwner: string | null = null;
          try { previousOwner = window.localStorage.getItem(OWNER_KEY); } catch { /* Storage is optional. */ }
          if (previousOwner) applyRef.current(defaultsRef.current);
          ownerDataHiddenRef.current = Boolean(previousOwner);
          setState({ status: "signed-out", user: null });
          return;
        }
        const controller = new AbortController();
        operationRef.current = controller;
        let previousOwner: string | null = null;
        try { previousOwner = window.localStorage.getItem(OWNER_KEY); } catch { /* Storage is optional. */ }
        const owner = cloudOwnerTag(user.uid);
        const sameOwner = previousOwner === owner;
        const baseline = sameOwner ? loadCloudBaseline(window.localStorage, owner) : null;
        baselineRef.current = baseline;
        const local = previousOwner === null ? snapshotRef.current
          : !sameOwner ? defaultsRef.current
          : ownerDataHiddenRef.current ? baseline ?? defaultsRef.current
            : snapshotRef.current;
        const localSerialized = JSON.stringify(local);
        if (previousOwner && !sameOwner) applyRef.current(defaultsRef.current);
        ownerDataHiddenRef.current = false;
        setState({ status: "syncing", user });
        void gateway.hydrate(user.uid, local, baseline, controller.signal).then((hydrated) => {
          if (!active || controller.signal.aborted) return;
          const current = snapshotRef.current;
          const reconciled = JSON.stringify(current) === localSerialized ? hydrated : reconcileConcurrentHydration(local, current, hydrated);
          try {
            window.localStorage.setItem(OWNER_KEY, owner);
            saveCloudBaseline(window.localStorage, owner, hydrated);
          } catch { /* Storage is optional. */ }
          lastSavedRef.current = JSON.stringify(hydrated);
          baselineRef.current = hydrated;
          applyRef.current(reconciled);
          readyUidRef.current = user.uid;
          setState({ status: "ready", user });
        }).catch(() => {
          if (active && !controller.signal.aborted) setState({ status: "error", user, message: "Cloud sync is temporarily unavailable. Local changes remain on this device." });
        });
      }, () => {
        window.clearTimeout(retryTimerRef.current);
        operationRef.current?.abort();
        readyUidRef.current = null;
        setState((current) => ({ ...current, status: "error", message: "Cloud account state could not be refreshed. Local data was preserved." }));
      });
    }).catch(() => {
      if (active) setState({ status: "error", user: null, message: "Cloud sign-in could not be initialized." });
    });
    return () => {
      active = false;
      window.clearTimeout(retryTimerRef.current);
      operationRef.current?.abort();
      unsubscribe();
      gatewayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const gateway = gatewayRef.current;
    const uid = readyUidRef.current;
    if (!gateway || !uid || serialized === lastSavedRef.current) return;
    window.clearTimeout(retryTimerRef.current);
    const timer = window.setTimeout(() => {
      const controller = operationRef.current;
      const pending = snapshotRef.current;
      if (!controller) return;
      saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
        const baseline = baselineRef.current;
        if (!baseline) throw new Error("Cloud baseline is unavailable.");
        return gateway.save(uid, pending, baseline, controller.signal);
      }).then((saved) => {
        if (!controller.signal.aborted && readyUidRef.current === uid) {
          const current = snapshotRef.current;
          const reconciled = JSON.stringify(current) === JSON.stringify(pending) ? saved : reconcileConcurrentHydration(pending, current, saved);
          lastSavedRef.current = JSON.stringify(saved);
          baselineRef.current = saved;
          try { saveCloudBaseline(window.localStorage, cloudOwnerTag(uid), saved); } catch { /* Storage is optional. */ }
          applyRef.current(reconciled);
          window.clearTimeout(retryTimerRef.current);
          setState((current) => ({ ...current, status: "ready", message: undefined }));
        }
      }).catch(() => {
        if (!controller.signal.aborted && readyUidRef.current === uid) {
          setState((current) => ({ ...current, status: "error", message: "Cloud sync is delayed. Local changes remain safe." }));
          window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => setRetryGeneration((current) => current + 1), 24_000 + Math.random() * 12_000);
        }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [retryGeneration, serialized]);

  useEffect(() => {
    const retryWhenOnline = () => {
      if (readyUidRef.current && serialized !== lastSavedRef.current) setRetryGeneration((current) => current + 1);
    };
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
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
    setState((current) => ({ ...current, status: "loading" }));
    try { await gateway.signOut(); } catch {
      setState((current) => ({ ...current, status: "error", message: "Sign-out could not be completed. Sync remains active." }));
    }
  }, []);

  return { state, signIn, signOut } as const;
}
