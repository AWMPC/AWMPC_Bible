import { useCallback, useEffect, useRef, useState } from "react";
import DataWorker from "./data.worker?worker";
import { dispatchChapterRequest, type PendingChapter } from "./chapterRequests";
import type { Book, ChapterTarget, Verse, WorkerRequest, WorkerResponse } from "./contracts";

export type Passage = Readonly<{ book: string; chapter: string; verses: Verse[] }>;
export type LibraryStatus = "loading" | "ready" | "error";

export function useBibleLibrary() {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef(new Map<number, PendingChapter>());
  const mountedRef = useRef(false);
  const readyRef = useRef(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [error, setError] = useState("");
  const [initialPassage, setInitialPassage] = useState<Passage | null>(null);

  const requestChapter = useCallback((target: ChapterTarget, book: string, chapter: string) => {
    const requestId = ++requestIdRef.current;
    return dispatchChapterRequest(workerRef.current, readyRef.current, pendingRef.current, requestId, target, book, chapter);
  }, []);

  const invalidate = useCallback((target: ChapterTarget) => {
    for (const [requestId, pending] of pendingRef.current) {
      if (pending.target !== target) continue;
      pending.resolve(null);
      pendingRef.current.delete(requestId);
    }
  }, []);

  const resolveAll = useCallback(() => {
    pendingRef.current.forEach(({ resolve }) => resolve(null));
    pendingRef.current.clear();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const worker = new DataWorker();
    workerRef.current = worker;
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.type === "ready") {
        readyRef.current = true;
        setBooks(data.books);
        setStatus("ready");
        const first = data.books[0];
        if (first) {
          void requestChapter("reader", first.name, first.chapters[0]).then((verses) => {
            if (mountedRef.current && verses) setInitialPassage({ book: first.name, chapter: first.chapters[0], verses });
          });
        }
      } else if (data.type === "chapter") {
        pendingRef.current.get(data.requestId)?.resolve(data.verses);
        pendingRef.current.delete(data.requestId);
      } else if ("requestId" in data) {
        pendingRef.current.get(data.requestId)?.resolve(null);
        pendingRef.current.delete(data.requestId);
      } else {
        readyRef.current = false;
        resolveAll();
        setError(data.message);
        setStatus("error");
      }
    };
    worker.onerror = () => {
      readyRef.current = false;
      resolveAll();
      setError("AWMPC Bible could not start. Please reload and try again.");
      setStatus("error");
    };
    worker.postMessage({ type: "load" } satisfies WorkerRequest);
    return () => {
      mountedRef.current = false;
      readyRef.current = false;
      resolveAll();
      worker.terminate();
      workerRef.current = null;
    };
  }, [requestChapter, resolveAll]);

  return { books, status, error, initialPassage, requestChapter, invalidate } as const;
}
