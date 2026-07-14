import { useCallback, useRef, useState } from "react";
import { LocalSearchHistoryStore, normalizeSearchHistory, type SearchHistoryStore } from "./SearchHistoryStore";

const createStore = () => new LocalSearchHistoryStore(window.localStorage);

export function useSearchHistory(factory: () => SearchHistoryStore = createStore) {
  const storeRef = useRef<SearchHistoryStore | null>(null);
  if (!storeRef.current) {
    try { storeRef.current = factory(); } catch { /* Storage is optional. */ }
  }
  const [entries, setEntries] = useState(() => storeRef.current?.list() ?? []);
  const entriesRef = useRef(entries);
  const replace = useCallback((value: unknown) => {
    const next = normalizeSearchHistory(value);
    entriesRef.current = next;
    setEntries(next);
    storeRef.current?.replace(next);
  }, []);
  const record = useCallback((query: string) => replace([query, ...entriesRef.current]), [replace]);
  const remove = useCallback((query: string) => replace(entriesRef.current.filter((entry) => entry !== query)), [replace]);
  const clear = useCallback(() => replace([]), [replace]);
  return { entries, record, remove, clear, replace } as const;
}
