import { isRetryableStatus, LIMITS } from "./library.ts";

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

export async function fetchDatasetText(url: string, options: FetchDatasetOptions = {}): Promise<string> {
  const fetcher = options.fetcher ?? fetch;
  const wait = options.wait ?? waitForDatasetRetry;
  let lastError: unknown = new DatasetLoadError("The library could not be loaded.");

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
