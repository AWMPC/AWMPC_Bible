export type BibleLanguage = string;

export const DEFAULT_BIBLE_LANGUAGE: BibleLanguage = "en";

type BibleDataEnvironment = Readonly<{ VITE_BIBLE_DATA_BASE_URL?: string }> | ImportMetaEnv;

export function isBibleLanguage(value: unknown): value is BibleLanguage {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function localBibleDataBaseUrl(baseUrl: string): string {
  return new URL("data/", baseUrl).href;
}

function normalizedBibleDataBaseUrl(value: string, fallback: string): string {
  try {
    const candidate = new URL(value, fallback);
    if ((candidate.protocol !== "http:" && candidate.protocol !== "https:") || candidate.username || candidate.password || !candidate.pathname.endsWith("/")) return fallback;
    return candidate.href;
  } catch {
    return fallback;
  }
}

export function bibleDataBaseUrl(baseUrl: string, environment: BibleDataEnvironment = import.meta.env): string {
  const fallback = localBibleDataBaseUrl(baseUrl);
  const configured = environment?.VITE_BIBLE_DATA_BASE_URL?.trim();
  return configured ? normalizedBibleDataBaseUrl(configured, fallback) : fallback;
}

export function bibleCatalogUrl(dataBaseUrl: string): string {
  return new URL("bibles.json", dataBaseUrl).href;
}

export function bibleDatasetUrl(language: BibleLanguage, baseUrl: string, dataBaseUrl = localBibleDataBaseUrl(baseUrl)): string {
  return new URL(`bible-${encodeURIComponent(language)}.json`, dataBaseUrl).href;
}

export type BibleLanguageOption = Readonly<{ id: BibleLanguage; label: string }>;

export function bibleLanguageOptionFromFilename(filename: string): BibleLanguageOption | null {
  const match = /^bible-(.+)\.json$/i.exec(filename);
  if (!match || !isBibleLanguage(match[1])) return null;
  return { id: match[1], label: match[1].replaceAll(/[._-]+/g, " ") };
}

export function isAllowedBibleDatasetUrl(language: BibleLanguage, datasetUrl: string, baseUrl: string, origin: string, dataBaseUrl = localBibleDataBaseUrl(baseUrl)): boolean {
  try {
    const base = new URL(baseUrl);
    const dataset = new URL(datasetUrl);
    const dataBase = new URL(dataBaseUrl);
    if (base.protocol !== "http:" && base.protocol !== "https:") return false;
    if (base.username || base.password || dataBase.username || dataBase.password || dataset.username || dataset.password) return false;
    return base.origin === origin
      && (dataBase.protocol === "http:" || dataBase.protocol === "https:")
      && dataset.origin === dataBase.origin
      && dataset.href === bibleDatasetUrl(language, base.href, dataBase.href);
  } catch {
    return false;
  }
}
