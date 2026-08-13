export type BibleLanguage = string;

export const DEFAULT_BIBLE_LANGUAGE: BibleLanguage = "en";

export function isBibleLanguage(value: unknown): value is BibleLanguage {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

export function bibleDatasetUrl(language: BibleLanguage, baseUrl: string): string {
  return new URL(`data/bible-${encodeURIComponent(language)}.json`, baseUrl).href;
}

export type BibleLanguageOption = Readonly<{ id: BibleLanguage; label: string }>;

export function bibleLanguageOptionFromFilename(filename: string): BibleLanguageOption | null {
  const match = /^bible-(.+)\.json$/i.exec(filename);
  if (!match || !isBibleLanguage(match[1])) return null;
  return { id: match[1], label: match[1].replaceAll(/[._-]+/g, " ") };
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
