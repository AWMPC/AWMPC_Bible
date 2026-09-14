import { isRetryableStatus, LIMITS } from "./library.ts";
import { BIBLE_DATA_CACHE_NAME } from "./cacheConstants.ts";

const ATTEMPTS = 4;
const TIMEOUT_MS = 15_000;

type FetchDatasetOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
  wait?: (attempt: number, signal: AbortSignal) => Promise<void>;
};

class DatasetLoadError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

export function waitForDatasetRetry(attempt: number, signal: AbortSignal, delayMs?: number): Promise<void> {
  const duration = delayMs ?? Math.min(4000, 250 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, duration);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function readBoundedBody(response: Response, signal: AbortSignal): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > LIMITS.bytes) {
    await response.body?.cancel();
    throw new DatasetLoadError("The data file is too large.");
  }
  if (!response.body) throw new DatasetLoadError("The data response has no body.", true);

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > LIMITS.bytes) {
        await reader.cancel();
        throw new DatasetLoadError("The data file is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (signal.aborted) throw signal.reason;
    if (error instanceof DatasetLoadError) throw error;
    throw new DatasetLoadError("The data response could not be read.", true);
  } finally {
    reader.releaseLock();
  }
}

function canUseDatasetCache(fetcher: typeof fetch): boolean {
  return fetcher === fetch && typeof caches !== "undefined";
}

async function readCachedDataset(url: string, signal?: AbortSignal): Promise<Response | null> {
  if (signal?.aborted) throw signal.reason;
  try {
    return await (await caches.open(BIBLE_DATA_CACHE_NAME)).match(url) ?? null;
  } catch {
    return null;
  }
}

async function removeCachedDataset(url: string): Promise<void> {
  try {
    await (await caches.open(BIBLE_DATA_CACHE_NAME)).delete(url);
  } catch {
    // Cache storage is best effort; the network path remains authoritative.
  }
}

async function cacheDatasetResponse(url: string, response: Response): Promise<void> {
  const declaredLength = Number(response.headers.get("content-length"));
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (!response.ok || (mediaType !== "application/json" && !mediaType?.endsWith("+json"))
    || (response.headers.has("content-length") && (!Number.isFinite(declaredLength) || declaredLength <= 0 || declaredLength > LIMITS.bytes)) || !response.body) return;
  try {
    await readBoundedBody(response.clone(), new AbortController().signal);
    await (await caches.open(BIBLE_DATA_CACHE_NAME)).put(url, response.clone());
  } catch {
    // Cache storage is best effort; a successful network response still serves.
  }
}

export async function fetchDatasetText(url: string, options: FetchDatasetOptions = {}): Promise<string> {
  const fetcher = options.fetcher ?? fetch;
  const wait = options.wait ?? waitForDatasetRetry;
  let lastError: unknown = new DatasetLoadError("The library could not be loaded.");

  if (canUseDatasetCache(fetcher)) {
    const cached = await readCachedDataset(url, options.signal);
    if (cached) {
      try {
        const mediaType = cached.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
        if (!cached.ok || (mediaType !== "application/json" && !mediaType?.endsWith("+json"))) {
          throw new DatasetLoadError("The cached Bible data file is invalid.");
        }
        return await readBoundedBody(cached, options.signal ?? new AbortController().signal);
      } catch (error) {
        if (options.signal?.aborted) throw options.signal.reason;
        await removeCachedDataset(url);
        lastError = error;
      }
    }
  }

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (options.signal?.aborted) throw options.signal.reason;
    const controller = new AbortController();
    const abortAttempt = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abortAttempt, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new DatasetLoadError("The data request timed out.", true)),
      options.timeoutMs ?? TIMEOUT_MS,
    );
    try {
      const response = await fetcher(url, {
        cache: "no-cache",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new DatasetLoadError(`Data request failed (${response.status}).`, isRetryableStatus(response.status));
      }
      const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
      if (mediaType !== "application/json" && !mediaType?.endsWith("+json")) {
        await response.body?.cancel().catch(() => undefined);
        throw new DatasetLoadError("The Bible data file is missing or is not served as JSON.");
      }
      if (canUseDatasetCache(fetcher)) await cacheDatasetResponse(url, response);
      return await readBoundedBody(response, controller.signal);
    } catch (error) {
      const cause = controller.signal.aborted ? controller.signal.reason : error;
      lastError = cause;
      const retryable = cause instanceof TypeError || (cause instanceof DatasetLoadError && cause.retryable);
      if (!retryable || attempt === ATTEMPTS - 1) throw cause;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortAttempt);
    }

    const backoff = new AbortController();
    const abortBackoff = () => backoff.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abortBackoff, { once: true });
    try {
      await wait(attempt, backoff.signal);
    } finally {
      options.signal?.removeEventListener("abort", abortBackoff);
      backoff.abort();
    }
  }
  throw lastError;
}
