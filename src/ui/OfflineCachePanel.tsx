import { useCallback, useEffect, useMemo, useState } from "react";
import type { BibleLanguageOption } from "../data/languages";
import { bibleDataBaseUrl } from "../data/languages";
import { cacheBibleTranslations, inspectOfflineCache, type OfflineCacheStatus } from "../data/offlineCache";

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Storage estimate unavailable";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB used`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB used`;
}

function initialStatus(): OfflineCacheStatus {
  return {
    supported: true,
    online: navigator.onLine,
    serviceWorker: "unavailable",
    catalogCached: false,
    translations: [],
    usageBytes: null,
    quotaBytes: null,
  };
}

export function OfflineCachePanel({ languages }: { languages: ReadonlyArray<BibleLanguageOption> }) {
  const [status, setStatus] = useState<OfflineCacheStatus>(initialStatus);
  const [checking, setChecking] = useState(true);
  const [caching, setCaching] = useState(false);
  const [message, setMessage] = useState("");
  const appBaseUrl = useMemo(() => new URL(import.meta.env.BASE_URL, document.baseURI).href, []);
  const dataBaseUrl = useMemo(() => bibleDataBaseUrl(appBaseUrl), [appBaseUrl]);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await inspectOfflineCache(appBaseUrl, dataBaseUrl, languages));
    } catch {
      setMessage("Cache status is unavailable.");
    } finally {
      setChecking(false);
    }
  }, [appBaseUrl, dataBaseUrl, languages]);

  useEffect(() => {
    void refresh();
    const onConnectionChange = () => void refresh();
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", onConnectionChange);
    window.addEventListener("offline", onConnectionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", onConnectionChange);
      window.removeEventListener("offline", onConnectionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const cacheTranslations = async () => {
    setCaching(true);
    setMessage("");
    try {
      await cacheBibleTranslations(appBaseUrl, dataBaseUrl, languages);
      setMessage("Catalog and translations are cached for offline reading.");
    } catch (error) {
      setMessage(error instanceof Error ? `Could not finish caching: ${error.message}` : "Could not finish caching.");
    } finally {
      setCaching(false);
      await refresh();
    }
  };

  const cachedTranslations = status.translations.filter(({ cached }) => cached).length;
  const serviceWorkerLabel = status.serviceWorker === "controlled" ? "Active" : status.serviceWorker === "registered" ? "Installed; reopen once online" : "Unavailable";
  return (
    <section className="setting-group offline-cache" aria-labelledby="offline-cache-title">
      <div className="setting-heading">
        <div><p className="eyebrow">Offline reading</p><h3 id="offline-cache-title">Translation cache</h3></div>
        <output aria-live="polite"><strong>{status.catalogCached && cachedTranslations === status.translations.length ? "Ready" : `${cachedTranslations}/${status.translations.length}`}</strong><span>{status.online ? "Online" : "Offline"}</span></output>
      </div>
      <p className="setting-note">Cached text opens without Wi‑Fi or mobile data.</p>
      <ul className="offline-cache-list">
        <li><span className={`offline-cache-dot${status.catalogCached ? " is-cached" : ""}`} aria-hidden="true" />Translation catalog<span>{status.catalogCached ? "Cached" : "Not cached"}</span></li>
        {status.translations.map(({ id, label, cached }) => <li key={id}><span className={`offline-cache-dot${cached ? " is-cached" : ""}`} aria-hidden="true" />{label}<span>{cached ? "Cached" : "Not cached"}</span></li>)}
      </ul>
      <div className="offline-cache-meta"><span>Service worker: {serviceWorkerLabel}</span><span>{formatBytes(status.usageBytes)}{status.quotaBytes ? ` of ${(status.quotaBytes / (1024 * 1024)).toFixed(0)} MB available` : ""}</span></div>
      <div className="offline-cache-actions">
        <button type="button" onClick={() => void cacheTranslations()} disabled={caching || checking || languages.length === 0}>{caching ? "Caching…" : "Cache translations now"}</button>
        <button type="button" onClick={() => void refresh()} disabled={checking || caching}>{checking ? "Checking…" : "Refresh status"}</button>
      </div>
      <p className="offline-cache-message" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
