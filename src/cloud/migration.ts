import { mergeHistoryEntries, normalizeHistoryEntries, type HistoryEntry } from "../history/HistoryStore.ts";
import { normalizeSearchHistory, searchHistoryKey } from "../search/SearchHistoryStore.ts";
import { normalizeBibleSettings, type BibleSettings } from "../settings/SettingsStore.ts";
import { textScaleAt } from "../settings/textScale.ts";
import type { CloudSnapshot } from "./contracts.ts";

const SCHEMA_VERSION = 2;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function legacySettings(root: Record<string, unknown>, fallback: BibleSettings): BibleSettings {
  const theme = root.themeMode === "light" ? "day" : root.themeMode === "dark" ? "night" : root.themeMode === "auto" ? "auto" : undefined;
  const dark = typeof root.dark === "boolean" ? (root.dark ? "night" : "day") : undefined;
  const fontValue = typeof root.font === "boolean" ? (root.font ? 125 : 100) : root.font;
  const fontIndex = typeof fontValue === "number" ? [50, 75, 100, 125, 150].indexOf(fontValue) : -1;
  return normalizeBibleSettings({ ...fallback, appearance: theme ?? dark ?? fallback.appearance, textScale: fontIndex >= 0 ? textScaleAt(fontIndex) : fallback.textScale });
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  return `legacy-${(hash >>> 0).toString(36)}`;
}

function legacyHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return normalizeHistoryEntries(value.flatMap((candidate) => {
    const raw: Record<string, unknown> = typeof candidate === "string"
      ? (([book, chapter, verse]) => ({ book, chapter, verse }))(candidate.split("|"))
      : object(candidate);
    const book = raw.book;
    const chapter = raw.ch ?? raw.chapter;
    const verse = raw.verse;
    const visitedAt = typeof raw.selectedAt === "string" && !Number.isNaN(Date.parse(raw.selectedAt)) ? new Date(raw.selectedAt).toISOString() : null;
    if (typeof book !== "string" || typeof chapter !== "string" && typeof chapter !== "number" || typeof verse !== "string" && typeof verse !== "number") return [];
    const canonical = { bibleLanguage: "en", book: book.trim(), chapter: String(chapter), verse: String(verse), visitedAt: visitedAt ?? "1970-01-01T00:00:00.000Z" } as const;
    return [{ ...canonical, id: stableId(`${canonical.bibleLanguage}|${canonical.book}|${canonical.chapter}|${canonical.verse}|${canonical.visitedAt}`) }];
  }));
}

function mergeList<T>(baseline: readonly T[], local: readonly T[], cloud: readonly T[], key: (value: T) => string): T[] {
  const baselineKeys = new Set(baseline.map(key));
  const localKeys = new Set(local.map(key));
  const cloudKeys = new Set(cloud.map(key));
  const removed = new Set([...baselineKeys].filter((candidate) => !localKeys.has(candidate) || !cloudKeys.has(candidate)));
  const seen = new Set<string>();
  return [...local.filter((entry) => !baselineKeys.has(key(entry))), ...cloud, ...local].filter((entry) => {
    const identity = key(entry);
    if (removed.has(identity) || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function reconcileCloudSnapshots(baseline: CloudSnapshot, local: CloudSnapshot, cloud: CloudSnapshot): CloudSnapshot {
  const settings = { ...cloud.settings };
  for (const key of Object.keys(settings) as Array<keyof BibleSettings>) {
    const localChanged = local.settings[key] !== baseline.settings[key];
    if (localChanged) Object.assign(settings, { [key]: local.settings[key] });
  }
  return {
    settings: normalizeBibleSettings(settings),
    history: normalizeHistoryEntries(mergeList(baseline.history, local.history, cloud.history, ({ id }) => id)),
    searchHistory: normalizeSearchHistory(mergeList(baseline.searchHistory, local.searchHistory, cloud.searchHistory, searchHistoryKey)),
  };
}

export function migrateCloudDocument(value: unknown, local: CloudSnapshot, baseline: CloudSnapshot | null = null): CloudSnapshot {
  const root = object(value);
  const canonical = object(root.awmpcBible);
  const schemaVersion = canonical.schemaVersion;
  if (typeof schemaVersion === "number" && Number.isInteger(schemaVersion) && schemaVersion > SCHEMA_VERSION) {
    throw new Error("This cloud data uses a newer schema.");
  }
  const settingsFallback = legacySettings(root, local.settings);
  const settings = Object.keys(object(canonical.settings)).length
    ? normalizeBibleSettings(canonical.settings, settingsFallback)
    : settingsFallback;
  const hasCanonicalHistory = Object.prototype.hasOwnProperty.call(canonical, "history");
  const importedHistory = hasCanonicalHistory ? normalizeHistoryEntries(canonical.history) : legacyHistory(root.history);
  const cloudSearch = normalizeSearchHistory(canonical.searchHistory ?? root.searchHistory);
  const cloud = {
    settings,
    history: importedHistory,
    searchHistory: cloudSearch,
  };
  return baseline ? reconcileCloudSnapshots(baseline, local, cloud) : {
    settings: cloud.settings,
    history: mergeHistoryEntries(cloud.history, local.history),
    searchHistory: normalizeSearchHistory([...cloud.searchHistory, ...local.searchHistory]),
  };
}

export function reconcileConcurrentHydration(initial: CloudSnapshot, current: CloudSnapshot, hydrated: CloudSnapshot): CloudSnapshot {
  return reconcileCloudSnapshots(initial, current, hydrated);
}

const LEGACY_FONT = [50, 75, 100, 125, 150] as const;
const SCALE_INDEX = new Map(["compact", "standard", "comfortable", "large", "extra-large"].map((value, index) => [value, index]));

export function cloudDocumentPatch(snapshot: CloudSnapshot, serverTimestamp: unknown): Record<string, unknown> {
  const history = normalizeHistoryEntries(snapshot.history);
  const searchHistory = normalizeSearchHistory(snapshot.searchHistory);
  return {
    awmpcBible: { schemaVersion: SCHEMA_VERSION, settings: snapshot.settings, history, searchHistory, updatedAt: serverTimestamp },
    themeMode: snapshot.settings.appearance === "day" ? "light" : snapshot.settings.appearance === "night" ? "dark" : "auto",
    font: LEGACY_FONT[SCALE_INDEX.get(snapshot.settings.textScale) ?? 1],
    history: history.slice(0, 30).map(({ book, chapter, verse, visitedAt }) => ({ book, ch: chapter, verse, selectedAt: visitedAt })),
    searchHistory,
    updatedAt: serverTimestamp,
  };
}
