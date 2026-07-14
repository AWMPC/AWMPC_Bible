export interface SearchHistoryStore {
  list(): string[];
  replace(entries: readonly string[]): void;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;
const STORAGE_KEY = "awmpc-bible.search-history.v1";
export const SEARCH_HISTORY_LIMIT = 20;

export function normalizeSearchHistory(value: unknown, limit = SEARCH_HISTORY_LIMIT): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const query = candidate.trim().slice(0, 120);
    const key = query.toLocaleLowerCase();
    if (Array.from(query).length < 2 || seen.has(key)) continue;
    seen.add(key);
    result.push(query);
    if (result.length === limit) break;
  }
  return result;
}

export class LocalSearchHistoryStore implements SearchHistoryStore {
  private readonly storage: MinimalStorage;

  constructor(storage: MinimalStorage) { this.storage = storage; }

  list(): string[] {
    try { return normalizeSearchHistory(JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "[]")); } catch { return []; }
  }

  replace(entries: readonly string[]): void {
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(normalizeSearchHistory(entries))); } catch { /* Session state remains usable. */ }
  }
}
