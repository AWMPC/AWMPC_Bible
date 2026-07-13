import { DEFAULT_TEXT_SCALE, isTextScale, type TextScale } from "./textScale.ts";
import { DEFAULT_VERSE_FONT, isVerseFont, type VerseFont } from "./verseFont.ts";
import { DEFAULT_APPEARANCE, isAppearance, type Appearance } from "./appearance.ts";
import { DEFAULT_BIBLE_LANGUAGE, isBibleLanguage, type BibleLanguage } from "./bibleLanguage.ts";

export type BibleSettings = Readonly<{
  textScale: TextScale;
  verseFont: VerseFont;
  appearance: Appearance;
  primaryBibleLanguage: BibleLanguage;
  secondaryBibleLanguage: BibleLanguage | null;
}>;

export interface SettingsStore {
  load(): BibleSettings;
  save(settings: BibleSettings): void;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;
const STORAGE_KEY = "awmpc-bible.settings.v2";
const PREVIOUS_STORAGE_KEY = "awmpc-bible.settings.v1";
const LEGACY_STORAGE_KEY = "quiet-reader.settings.v1";

export function activeBibleLanguages(settings: Pick<BibleSettings, "primaryBibleLanguage" | "secondaryBibleLanguage">): BibleLanguage[] {
  return settings.secondaryBibleLanguage
    ? [settings.primaryBibleLanguage, settings.secondaryBibleLanguage]
    : [settings.primaryBibleLanguage];
}

export function normalizeBibleSettings(value: unknown): BibleSettings {
  const settings = value && typeof value === "object" ? value as Partial<BibleSettings> & { bibleLanguage?: unknown } : {};
  const primaryBibleLanguage = isBibleLanguage(settings.primaryBibleLanguage)
    ? settings.primaryBibleLanguage
    : isBibleLanguage(settings.bibleLanguage) ? settings.bibleLanguage : DEFAULT_BIBLE_LANGUAGE;
  const secondaryBibleLanguage = isBibleLanguage(settings.secondaryBibleLanguage) && settings.secondaryBibleLanguage !== primaryBibleLanguage
    ? settings.secondaryBibleLanguage
    : null;
  return {
    textScale: isTextScale(settings.textScale) ? settings.textScale : DEFAULT_TEXT_SCALE,
    verseFont: isVerseFont(settings.verseFont) ? settings.verseFont : DEFAULT_VERSE_FONT,
    appearance: isAppearance(settings.appearance) ? settings.appearance : DEFAULT_APPEARANCE,
    primaryBibleLanguage,
    secondaryBibleLanguage,
  };
}

export function withPrimaryBibleLanguage(settings: BibleSettings, language: BibleLanguage): BibleSettings {
  return {
    ...settings,
    primaryBibleLanguage: language,
    secondaryBibleLanguage: settings.secondaryBibleLanguage === language ? settings.primaryBibleLanguage : settings.secondaryBibleLanguage,
  };
}

export function withSecondaryBibleLanguage(settings: BibleSettings, language: BibleLanguage | null): BibleSettings {
  return { ...settings, secondaryBibleLanguage: language && language !== settings.primaryBibleLanguage ? language : null };
}

export class LocalSettingsStore implements SettingsStore {
  private readonly storage: MinimalStorage;

  constructor(storage: MinimalStorage) {
    this.storage = storage;
  }

  load(): BibleSettings {
    try {
      const current = this.storage.getItem(STORAGE_KEY);
      const previous = current === null ? this.storage.getItem(PREVIOUS_STORAGE_KEY) : null;
      const legacy = current === null && previous === null ? this.storage.getItem(LEGACY_STORAGE_KEY) : null;
      const parsed: unknown = JSON.parse(current ?? previous ?? legacy ?? "null");
      const validated = normalizeBibleSettings(parsed);
      if (current === null && (previous !== null || legacy !== null)) {
        try { this.storage.setItem(STORAGE_KEY, JSON.stringify(validated)); } catch { /* Legacy data remains usable. */ }
      }
      return validated;
    } catch {
      // Invalid or unavailable device storage falls back to a safe default.
    }
    return normalizeBibleSettings(null);
  }

  save(settings: BibleSettings): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The active session still retains the selected setting.
    }
  }
}
