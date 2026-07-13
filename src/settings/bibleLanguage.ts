import { DEFAULT_BIBLE_LANGUAGE, isBibleLanguage, type BibleLanguage } from "../data/languages.ts";

export { DEFAULT_BIBLE_LANGUAGE, isBibleLanguage, type BibleLanguage };

export const BIBLE_LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "ko", label: "Korean" },
] as const satisfies ReadonlyArray<Readonly<{ id: BibleLanguage; label: string }>>;
