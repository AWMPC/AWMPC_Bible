import { bibleCatalogUrl, bibleDatasetUrl, bibleLanguageOptionFromFilename, isBibleLanguage, type BibleLanguageOption } from "./languages";
import { BIBLE_DATA_CACHE_NAME } from "./cacheConstants";
import { fetchDatasetText } from "./fetchDataset";

export type OfflineCacheStatus = Readonly<{
  supported: boolean;
  online: boolean;
  serviceWorker: "controlled" | "registered" | "unavailable";
  catalogCached: boolean;
  translations: ReadonlyArray<Readonly<{ id: string; label: string; cached: boolean }>>;
  usageBytes: number | null;
  quotaBytes: number | null;
}>;

const EMPTY_STATUS: OfflineCacheStatus = Object.freeze({
  supported: false,
  online: true,
  serviceWorker: "unavailable",
  catalogCached: false,
  translations: [],
  usageBytes: null,
  quotaBytes: null,
});

async function serviceWorkerState(): Promise<OfflineCacheStatus["serviceWorker"]> {
  if (!("serviceWorker" in navigator)) return "unavailable";
  if (navigator.serviceWorker.controller) return "controlled";
  try {
    return await navigator.serviceWorker.getRegistration() ? "registered" : "unavailable";
  } catch {
    return "unavailable";
  }
}

function cachedTranslationOptions(requests: ReadonlyArray<Request>, dataBaseUrl: string): ReadonlyArray<BibleLanguageOption> {
  try {
    const base = new URL(dataBaseUrl);
    const options = new Map<string, BibleLanguageOption>();
    for (const request of requests) {
      const url = new URL(request.url);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search) continue;
      const option = bibleLanguageOptionFromFilename(url.pathname.slice(base.pathname.length));
      if (option && isBibleLanguage(option.id)) options.set(option.id, option);
    }
    return [...options.values()];
  } catch {
    return [];
  }
}

export async function inspectOfflineCache(appBaseUrl: string, dataBaseUrl: string, languages: ReadonlyArray<BibleLanguageOption>): Promise<OfflineCacheStatus> {
  const online = navigator.onLine;
  const worker = await serviceWorkerState();
  if (typeof caches === "undefined") return { ...EMPTY_STATUS, online, serviceWorker: worker };
  try {
    const cache = await caches.open(BIBLE_DATA_CACHE_NAME);
    const requests = await cache.keys();
    const cachedUrls = new Set(requests.map((request) => request.url));
    const languageById = new Map(languages.map((language) => [language.id, language]));
    for (const language of cachedTranslationOptions(requests, dataBaseUrl)) {
      if (!languageById.has(language.id)) languageById.set(language.id, language);
    }
    const estimate = await navigator.storage?.estimate();
    return {
      supported: true,
      online,
      serviceWorker: worker,
      catalogCached: cachedUrls.has(bibleCatalogUrl(dataBaseUrl)),
      translations: [...languageById.values()].map(({ id, label }) => ({ id, label, cached: cachedUrls.has(bibleDatasetUrl(id, appBaseUrl, dataBaseUrl)) })),
      usageBytes: estimate?.usage ?? null,
      quotaBytes: estimate?.quota ?? null,
    };
  } catch {
    return { ...EMPTY_STATUS, online, serviceWorker: worker };
  }
}

export async function cacheBibleTranslations(appBaseUrl: string, dataBaseUrl: string, languages: ReadonlyArray<BibleLanguageOption>): Promise<void> {
  const catalogUrl = bibleCatalogUrl(dataBaseUrl);
  const discoveredLanguages = new Map(languages.map((language) => [language.id, language]));
  try {
    const catalog = JSON.parse(await fetchDatasetText(catalogUrl)) as unknown;
    if (Array.isArray(catalog)) {
      for (const entry of catalog) {
        if (entry && typeof entry === "object" && "id" in entry && isBibleLanguage(entry.id)) {
          const label = "label" in entry && typeof entry.label === "string" ? entry.label : entry.id;
          discoveredLanguages.set(entry.id, { id: entry.id, label });
        }
      }
    }
  } catch {
    if (discoveredLanguages.size === 0) throw new Error("The translation catalog is unavailable.");
  }
  const urls = [catalogUrl, ...[...discoveredLanguages.values()].map(({ id }) => bibleDatasetUrl(id, appBaseUrl, dataBaseUrl))];
  let nextIndex = 0;
  const fillCache = async () => {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex++];
      await fetchDatasetText(url);
    }
  };
  await Promise.all([fillCache(), fillCache()]);
}
