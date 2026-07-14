import { useCallback, useRef, useState } from "react";
import { LocalSearchHistoryStore, normalizeSearchHistory, type SearchHistoryStore } from "./SearchHistoryStore";

const createStore = () => new LocalSearchHistoryStore(window.localStorage);

export function useSearchHistory(factory: () => SearchHistoryStore = createStore) {
  const storeRef = useRef<SearchHistoryStore | null>(null);
  if (!storeRef.current) {
    try { storeRef.current = factory(); } catch { /* Storage is optional. */ }
  }
  const [entries, setEntries] = useState(() => storeRef.current?.list() ?? []);
  const replace = useCallback((value: unknown) => {
    const next = normalizeSearchHistory(value);
    setEntries(next);
    storeRef.current?.replace(next);
  }, []);
  const record = useCallback((query: string) => replace([query, ...entries]), [entries, replace]);
  const remove = useCallback((query: string) => replace(entries.filter((entry) => entry !== query)), [entries, replace]);
  const clear = useCallback(() => replace([]), [replace]);
  return { entries, record, remove, clear, replace } as const;
}
