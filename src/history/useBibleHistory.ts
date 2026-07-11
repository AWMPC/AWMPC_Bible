import { useCallback, useEffect, useRef, useState } from "react";
import { LocalHistoryStore, type HistoryEntry, type HistorySelection, type HistoryStore } from "./HistoryStore";

const createLocalHistoryStore = () => new LocalHistoryStore(window.localStorage);

export function useBibleHistory(createStore: () => HistoryStore = createLocalHistoryStore) {
  const storeRef = useRef<HistoryStore | null>(null);
  const generationRef = useRef(0);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const generation = ++generationRef.current;
    try {
      const store = createStore();
      storeRef.current = store;
      void store.list().then((history) => {
        if (generation === generationRef.current) setEntries(history);
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
    void store.add(selection).then((entry) => {
      if (store === storeRef.current) setEntries((current) => [entry, ...current].slice(0, 200));
    }).catch(() => undefined);
  }, []);

  return { entries, record } as const;
}
