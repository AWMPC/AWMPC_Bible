const APP_VERSION = "__APP_VERSION__";
const CACHE_NAME = `awmpc-bible-shell-${APP_VERSION}`;
const DATA_CACHE_NAME = "awmpc-bible-data-v1";
const DATA_FETCH_TIMEOUT_MS = 15_000;
const CONFIGURED_DATA_BASE_URL = __BIBLE_DATA_BASE_URL__;
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

function dataBaseUrl() {
  const fallback = new URL("./data/", self.location.href);
  if (!CONFIGURED_DATA_BASE_URL) return fallback;
  try {
    const candidate = new URL(CONFIGURED_DATA_BASE_URL, fallback);
    if ((candidate.protocol !== "http:" && candidate.protocol !== "https:") || candidate.username || candidate.password || !candidate.pathname.endsWith("/")) return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}

const BIBLE_DATA_BASE_URL = dataBaseUrl();

function isBibleDataRequest(url) {
  if (url.origin !== BIBLE_DATA_BASE_URL.origin || !url.pathname.startsWith(BIBLE_DATA_BASE_URL.pathname)) return false;
  const relativePath = url.pathname.slice(BIBLE_DATA_BASE_URL.pathname.length);
  return relativePath === "bibles.json" || /^bible-[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i.test(relativePath);
}

function isJsonResponse(response) {
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const contentLength = response.headers.get("content-length");
  const declaredLength = Number(contentLength);
  return response.ok && (mediaType === "application/json" || mediaType?.endsWith("+json"))
    && (!contentLength || (Number.isFinite(declaredLength) && declaredLength > 0 && declaredLength <= 8 * 1024 * 1024));
}

async function responseFitsDataLimit(response) {
  if (!response.body) return false;
  const reader = response.clone().body.getReader();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return true;
      bytes += value.byteLength;
      if (bytes > 8 * 1024 * 1024) {
        await reader.cancel();
        return false;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function cacheBibleData(request, response) {
  if (!isJsonResponse(response) || !response.body) return response;
  try {
    if (!await responseFitsDataLimit(response)) return response;
    const cache = await caches.open(DATA_CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {
    // Cache storage is best effort; the network response remains usable.
  }
  return response;
}

async function refreshBibleData(request) {
  try {
    await cacheBibleData(request, await fetch(request, { cache: "no-cache", credentials: "omit" }));
  } catch {
    // An offline refresh must never replace a usable cached translation.
  }
}

async function serveBibleData(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    void refreshBibleData(request);
    return cached;
  }
  return cacheBibleData(request, await fetch(request));
}

async function fetchBibleData(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DATA_FETCH_TIMEOUT_MS);
  try {
    return await fetch(request, { cache: "no-cache", credentials: "omit", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function warmBibleDataCache() {
  const cache = await caches.open(DATA_CACHE_NAME);
  const catalogRequest = new Request(new URL("bibles.json", BIBLE_DATA_BASE_URL).href, { credentials: "omit" });
  let catalogResponse = await cache.match(catalogRequest);
  if (!catalogResponse) catalogResponse = await fetchBibleData(catalogRequest);
  if (!isJsonResponse(catalogResponse)) return;

  let catalog;
  try {
    catalog = await catalogResponse.clone().json();
  } catch {
    return;
  }
  await cacheBibleData(catalogRequest, catalogResponse);
  if (!Array.isArray(catalog)) return;

  const requests = catalog
    .filter((entry) => entry && typeof entry.id === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.id))
    .slice(0, 100)
    .map((entry) => new Request(new URL(`bible-${encodeURIComponent(entry.id)}.json`, BIBLE_DATA_BASE_URL).href, { credentials: "omit" }));
  await Promise.all(requests.map(async (request) => {
    if (await cache.match(request)) return;
    try {
      await cacheBibleData(request, await fetchBibleData(request));
    } catch {
      // Warming is optional; the active reader still fetches on demand.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== DATA_CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => caches.open(DATA_CACHE_NAME))
      .then((cache) => cache.keys().then((requests) => Promise.all(requests.filter((request) => !isBibleDataRequest(new URL(request.url))).map((request) => cache.delete(request)))))
      .then(() => warmBibleDataCache().catch(() => undefined))
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (isBibleDataRequest(url)) {
    event.respondWith(serveBibleData(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
