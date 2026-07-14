const TRANSIENT_CODES = new Set([
  "aborted", "cancelled", "deadline-exceeded", "internal", "resource-exhausted", "unavailable", "unknown",
  "auth/network-request-failed", "auth/too-many-requests",
]);

export function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code.replace(/^firestore\//, "")
    : "";
}

export function isRetryableCloudError(error: unknown): boolean {
  return TRANSIENT_CODES.has(errorCode(error));
}

export async function withBackoff<T>(operation: () => Promise<T>, signal: AbortSignal, delays = [1000, 2000, 4000, 8000, 16000]): Promise<T> {
  let attempt = 0;
  while (true) {
    signal.throwIfAborted();
    try { return await operation(); } catch (error) {
      if (!isRetryableCloudError(error) || attempt >= delays.length) throw error;
      const delay = delays[attempt++] * (.8 + Math.random() * .4);
      await new Promise<void>((resolve, reject) => {
        const finish = () => { signal.removeEventListener("abort", abort); resolve(); };
        const timer = window.setTimeout(finish, delay);
        const abort = () => { window.clearTimeout(timer); reject(signal.reason); };
        signal.addEventListener("abort", abort, { once: true });
      });
    }
  }
}
