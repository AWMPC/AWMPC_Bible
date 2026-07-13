import { DEFAULT_TEXT_SCALE, isTextScale, type TextScale } from "./textScale.ts";
import { DEFAULT_VERSE_FONT, isVerseFont, type VerseFont } from "./verseFont.ts";
import { DEFAULT_APPEARANCE, isAppearance, type Appearance } from "./appearance.ts";
import { DEFAULT_BIBLE_LANGUAGE, isBibleLanguage, type BibleLanguage } from "./bibleLanguage.ts";

export type BibleSettings = Readonly<{ textScale: TextScale; verseFont: VerseFont; appearance: Appearance; bibleLanguage: BibleLanguage }>;

export interface SettingsStore {
  load(): BibleSettings;
  save(settings: BibleSettings): void;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;
const STORAGE_KEY = "awmpc-bible.settings.v1";
const LEGACY_STORAGE_KEY = "quiet-reader.settings.v1";

export class LocalSettingsStore implements SettingsStore {
  private readonly storage: MinimalStorage;

  constructor(storage: MinimalStorage) {
    this.storage = storage;
  }

  load(): BibleSettings {
    try {
      const current = this.storage.getItem(STORAGE_KEY);
      const legacy = current === null ? this.storage.getItem(LEGACY_STORAGE_KEY) : null;
      const parsed: unknown = JSON.parse(current ?? legacy ?? "null");
      const settings = parsed && typeof parsed === "object" ? parsed as Partial<BibleSettings> : {};
      const validated: BibleSettings = {
        textScale: isTextScale(settings.textScale) ? settings.textScale : DEFAULT_TEXT_SCALE,
        verseFont: isVerseFont(settings.verseFont) ? settings.verseFont : DEFAULT_VERSE_FONT,
        appearance: isAppearance(settings.appearance) ? settings.appearance : DEFAULT_APPEARANCE,
        bibleLanguage: isBibleLanguage(settings.bibleLanguage) ? settings.bibleLanguage : DEFAULT_BIBLE_LANGUAGE,
      };
      if (current === null && legacy !== null) {
        try { this.storage.setItem(STORAGE_KEY, JSON.stringify(validated)); } catch { /* Legacy data remains usable. */ }
      }
      return validated;
    } catch {
      // Invalid or unavailable device storage falls back to a safe default.
    }
    return { textScale: DEFAULT_TEXT_SCALE, verseFont: DEFAULT_VERSE_FONT, appearance: DEFAULT_APPEARANCE, bibleLanguage: DEFAULT_BIBLE_LANGUAGE };
  }

  save(settings: BibleSettings): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The active session still retains the selected setting.
    }
  }
}
