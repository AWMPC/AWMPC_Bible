const APP_VERSION = "__APP_VERSION__";
const CACHE_NAME = `awmpc-bible-shell-${APP_VERSION}`;
const DATA_CACHE_NAME = "awmpc-bible-data-v1";
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
  const declaredLength = Number(response.headers.get("content-length") || 0);
  return response.ok && (mediaType === "application/json" || mediaType?.endsWith("+json"))
    && Number.isFinite(declaredLength) && declaredLength > 0 && declaredLength <= 8 * 1024 * 1024;
}

async function cacheBibleData(request, response) {
  if (!isJsonResponse(response) || !response.body) return response;
  try {
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
