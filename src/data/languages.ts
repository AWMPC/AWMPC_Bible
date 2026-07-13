export const BIBLE_LANGUAGES = ["en", "ko"] as const;

export type BibleLanguage = (typeof BIBLE_LANGUAGES)[number];

export const DEFAULT_BIBLE_LANGUAGE: BibleLanguage = "en";

export function isBibleLanguage(value: unknown): value is BibleLanguage {
  return typeof value === "string" && BIBLE_LANGUAGES.includes(value as BibleLanguage);
}

export function bibleDatasetUrl(language: BibleLanguage, baseUrl: string): string {
  return new URL(`data/bible-${language}.json`, baseUrl).href;
}

export function isAllowedBibleDatasetUrl(language: BibleLanguage, datasetUrl: string, baseUrl: string, origin: string): boolean {
  try {
    const base = new URL(baseUrl);
    const dataset = new URL(datasetUrl);
    if (base.protocol !== "http:" && base.protocol !== "https:") return false;
    if (base.username || base.password || dataset.username || dataset.password) return false;
    return base.origin === origin
      && dataset.origin === origin
      && dataset.href === bibleDatasetUrl(language, base.href);
  } catch {
    return false;
  }
}
