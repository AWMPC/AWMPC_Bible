import type { ChapterTarget, Verse, WorkerRequest } from "./contracts.ts";

export type PendingChapter = {
  target: ChapterTarget;
  resolve: (verses: Verse[] | null) => void;
};

type ChapterWorker = Pick<Worker, "postMessage">;

export function dispatchChapterRequest(
  worker: ChapterWorker | null,
  ready: boolean,
  pending: Map<number, PendingChapter>,
  requestId: number,
  target: ChapterTarget,
  book: string,
  chapter: string,
): Promise<Verse[] | null> {
  if (!worker || !ready) return Promise.resolve(null);
  return new Promise((resolve) => {
    pending.set(requestId, { target, resolve });
    try {
      worker.postMessage({ type: "chapter", requestId, target, book, chapter } satisfies WorkerRequest);
    } catch {
      pending.delete(requestId);
      resolve(null);
    }
  });
}
