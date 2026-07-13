import type { ChapterTarget, Verse, WorkerRequest } from "./contracts.ts";

export type PendingChapter = {
  target: ChapterTarget;
  resolve: (verses: Verse[] | null) => void;
};

type ChapterWorker = Pick<Worker, "postMessage">;

export const CHAPTER_REQUEST_TIMEOUT_MS = 15_000;

export function dispatchChapterRequest(
  worker: ChapterWorker | null,
  ready: boolean,
  pending: Map<number, PendingChapter>,
  requestId: number,
  target: ChapterTarget,
  book: string,
  chapter: string,
  timeoutMs = CHAPTER_REQUEST_TIMEOUT_MS,
): Promise<Verse[] | null> {
  if (!worker || !ready) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const settle = (verses: Verse[] | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      pending.delete(requestId);
      resolve(verses);
    };

    pending.set(requestId, { target, resolve: settle });
    timeout = setTimeout(() => settle(null), timeoutMs);
    try {
      worker.postMessage({ type: "chapter", requestId, target, book, chapter } satisfies WorkerRequest);
    } catch {
      settle(null);
    }
  });
}
