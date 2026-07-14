import { mergeHistoryEntries, normalizeHistoryEntries, type HistoryEntry } from "../history/HistoryStore.ts";
import { normalizeSearchHistory } from "../search/SearchHistoryStore.ts";
import { normalizeBibleSettings, type BibleSettings } from "../settings/SettingsStore.ts";
import { textScaleAt } from "../settings/textScale.ts";
import type { CloudSnapshot } from "./contracts.ts";

const SCHEMA_VERSION = 1;

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

export function migrateCloudDocument(value: unknown, local: CloudSnapshot): CloudSnapshot {
  const root = object(value);
  const canonical = object(root.awmpcBible);
  const settings = Object.keys(object(canonical.settings)).length
    ? normalizeBibleSettings(canonical.settings)
    : legacySettings(root, local.settings);
  const cloudHistory = normalizeHistoryEntries(canonical.history);
  const importedHistory = cloudHistory.length ? cloudHistory : legacyHistory(root.history);
  const cloudSearch = normalizeSearchHistory(canonical.searchHistory ?? root.searchHistory);
  return {
    settings,
    history: mergeHistoryEntries(importedHistory, local.history),
    searchHistory: normalizeSearchHistory([...cloudSearch, ...local.searchHistory]),
  };
}

export function reconcileConcurrentHydration(initial: CloudSnapshot, current: CloudSnapshot, hydrated: CloudSnapshot): CloudSnapshot {
  const settings = { ...hydrated.settings };
  for (const key of Object.keys(settings) as Array<keyof BibleSettings>) {
    if (current.settings[key] !== initial.settings[key]) Object.assign(settings, { [key]: current.settings[key] });
  }
  const initialIds = new Set(initial.history.map(({ id }) => id));
  const newHistory = current.history.filter(({ id }) => !initialIds.has(id));
  const initialSearch = new Set(initial.searchHistory.map((query) => query.toLocaleLowerCase()));
  const newSearch = current.searchHistory.filter((query) => !initialSearch.has(query.toLocaleLowerCase()));
  return {
    settings: normalizeBibleSettings(settings),
    history: mergeHistoryEntries(newHistory, hydrated.history),
    searchHistory: normalizeSearchHistory([...newSearch, ...hydrated.searchHistory]),
  };
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
