import { DEFAULT_BIBLE_LANGUAGE, isBibleLanguage, type BibleLanguage } from "../data/languages.ts";

export { DEFAULT_BIBLE_LANGUAGE, isBibleLanguage, type BibleLanguage };

export const BIBLE_LANGUAGE_OPTIONS: ReadonlyArray<Readonly<{ id: BibleLanguage; label: string }>> = [];
