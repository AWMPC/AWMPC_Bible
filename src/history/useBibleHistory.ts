import { useCallback, useEffect, useRef, useState } from "react";
import { LocalHistoryStore, mergeHistoryEntries, type HistoryEntry, type HistorySelection, type HistoryStore } from "./HistoryStore";

const createLocalHistoryStore = () => new LocalHistoryStore(window.localStorage);

export function useBibleHistory(createStore: () => HistoryStore = createLocalHistoryStore) {
  const storeRef = useRef<HistoryStore | null>(null);
  const generationRef = useRef(0);
  const contentGenerationRef = useRef(0);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const generation = ++generationRef.current;
    const contentGeneration = contentGenerationRef.current;
    try {
      const store = createStore();
      storeRef.current = store;
      void store.list().then((history) => {
        if (generation === generationRef.current && contentGeneration === contentGenerationRef.current) {
          setEntries((current) => mergeHistoryEntries(current, history));
        }
      }).catch(() => undefined);
    } catch {
      storeRef.current = null;
    }
    return () => {
      generationRef.current += 1;
      storeRef.current = null;
    };
  }, [createStore]);

  const record = useCallback((selection: HistorySelection) => {
    const store = storeRef.current;
    if (!store) return;
    const contentGeneration = contentGenerationRef.current;
    void store.add(selection).then((entry) => {
      if (store === storeRef.current && contentGeneration === contentGenerationRef.current) {
        setEntries((current) => mergeHistoryEntries([entry], current));
      }
    }).catch(() => undefined);
  }, []);

  const remove = useCallback((id: string) => {
    const store = storeRef.current;
    setEntries((current) => current.filter((entry) => entry.id !== id));
    void store?.remove(id).catch(() => undefined);
  }, []);

  const clear = useCallback(() => {
    const store = storeRef.current;
    contentGenerationRef.current += 1;
    setEntries([]);
    void store?.clear().catch(() => undefined);
  }, []);

  return { entries, record, remove, clear } as const;
}
