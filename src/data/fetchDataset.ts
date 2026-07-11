import { isRetryableStatus, LIMITS } from "./library.ts";

const ATTEMPTS = 4;
const TIMEOUT_MS = 15_000;

type FetchDatasetOptions = {
  fetcher?: typeof fetch;
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

function defaultWait(attempt: number, signal: AbortSignal): Promise<void> {
  const duration = Math.min(4000, 250 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, duration);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
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
  const wait = options.wait ?? defaultWait;
  let lastError: unknown = new DatasetLoadError("The library could not be loaded.");

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new DatasetLoadError("The data request timed out.", true)),
      options.timeoutMs ?? TIMEOUT_MS,
    );
    try {
      const response = await fetcher(url, {
        cache: "force-cache",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new DatasetLoadError(`Data request failed (${response.status}).`, isRetryableStatus(response.status));
      }
      return await readBoundedBody(response, controller.signal);
    } catch (error) {
      const cause = controller.signal.aborted ? controller.signal.reason : error;
      lastError = cause;
      const retryable = cause instanceof TypeError || (cause instanceof DatasetLoadError && cause.retryable);
      if (!retryable || attempt === ATTEMPTS - 1) throw cause;
    } finally {
      clearTimeout(timeout);
    }

    const backoff = new AbortController();
    try {
      await wait(attempt, backoff.signal);
    } finally {
      backoff.abort();
    }
  }
  throw lastError;
}
