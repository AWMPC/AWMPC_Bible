import { normalizeHistoryEntries } from "../history/HistoryStore.ts";
import { normalizeSearchHistory } from "../search/SearchHistoryStore.ts";
import { normalizeBibleSettings } from "../settings/SettingsStore.ts";
import type { CloudSnapshot } from "./contracts.ts";

const BASELINE_KEY = "awmpc-bible.cloud-baseline.v1";
type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

export function cloudOwnerTag(uid: string): string {
  let hash = 2166136261;
  for (const character of uid) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  return `owner-${(hash >>> 0).toString(36)}`;
}

function normalizeSnapshot(value: unknown): CloudSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<CloudSnapshot>;
  if (!snapshot.settings || !Array.isArray(snapshot.history) || !Array.isArray(snapshot.searchHistory)) return null;
  return {
    settings: normalizeBibleSettings(snapshot.settings),
    history: normalizeHistoryEntries(snapshot.history),
    searchHistory: normalizeSearchHistory(snapshot.searchHistory),
  };
}

export function loadCloudBaseline(storage: MinimalStorage, owner: string): CloudSnapshot | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(BASELINE_KEY) ?? "null");
    if (!value || typeof value !== "object" || (value as { owner?: unknown }).owner !== owner) return null;
    return normalizeSnapshot((value as { snapshot?: unknown }).snapshot);
  } catch { return null; }
}

export function saveCloudBaseline(storage: MinimalStorage, owner: string, snapshot: CloudSnapshot): void {
  try { storage.setItem(BASELINE_KEY, JSON.stringify({ owner, snapshot })); } catch { /* Sync remains safe without an offline baseline. */ }
}
