import { DEFAULT_TEXT_SCALE, isTextScale, type TextScale } from "./textScale.ts";
import { DEFAULT_VERSE_FONT, isVerseFont, type VerseFont } from "./verseFont.ts";

export type ReaderSettings = Readonly<{ textScale: TextScale; verseFont: VerseFont }>;

export interface SettingsStore {
  load(): ReaderSettings;
  save(settings: ReaderSettings): void;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;
const STORAGE_KEY = "quiet-reader.settings.v1";

export class LocalSettingsStore implements SettingsStore {
  private readonly storage: MinimalStorage;

  constructor(storage: MinimalStorage) {
    this.storage = storage;
  }

  load(): ReaderSettings {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "null");
      const settings = parsed && typeof parsed === "object" ? parsed as Partial<ReaderSettings> : {};
      return {
        textScale: isTextScale(settings.textScale) ? settings.textScale : DEFAULT_TEXT_SCALE,
        verseFont: isVerseFont(settings.verseFont) ? settings.verseFont : DEFAULT_VERSE_FONT,
      };
    } catch {
      // Invalid or unavailable device storage falls back to a safe default.
    }
    return { textScale: DEFAULT_TEXT_SCALE, verseFont: DEFAULT_VERSE_FONT };
  }

  save(settings: ReaderSettings): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The active session still retains the selected setting.
    }
  }
}
