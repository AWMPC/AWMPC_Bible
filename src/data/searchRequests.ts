import type { SearchResult, WorkerRequest } from "./contracts";

export type PendingSearch = Readonly<{ resolve: (results: SearchResult[] | null) => void; timeout: ReturnType<typeof setTimeout> }>;

export function dispatchSearchRequest(
  worker: Pick<Worker, "postMessage"> | null,
  ready: boolean,
  pending: Map<number, PendingSearch>,
  requestId: number,
  query: string,
  limit: number,
  timeoutMs = 10_000,
): Promise<SearchResult[] | null> {
  if (!worker || !ready) return Promise.resolve(null);
  return new Promise((resolve) => {
    const settle = (results: SearchResult[] | null) => {
      const request = pending.get(requestId);
      if (!request) return;
      clearTimeout(request.timeout);
      pending.delete(requestId);
      resolve(results);
    };
    const timeout = setTimeout(() => settle(null), timeoutMs);
    pending.set(requestId, { resolve: settle, timeout });
    try {
      worker.postMessage({ type: "search", requestId, query, limit } satisfies WorkerRequest);
    } catch {
      settle(null);
    }
  });
}
