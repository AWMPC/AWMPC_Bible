import { useCallback, useEffect, useRef, useState } from "react";
import DataWorker from "./data.worker?worker";
import { dispatchChapterRequest, type PendingChapter } from "./chapterRequests";
import { dispatchSearchRequest, type PendingSearch } from "./searchRequests";
import type { Book, ChapterTarget, SearchResult, Verse, WorkerRequest, WorkerResponse } from "./contracts";
import { bibleDataBaseUrl, bibleDatasetUrl, DEFAULT_BIBLE_LANGUAGE, type BibleLanguage } from "./languages";

export type Passage = Readonly<{ book: string; chapter: string; verses: Verse[] }>;
export type LibraryStatus = "idle" | "loading" | "ready" | "error";

export function useBibleLibrary(language: BibleLanguage | null = DEFAULT_BIBLE_LANGUAGE) {
  const workerRef = useRef<Worker | null>(null);
  const requestedLanguageRef = useRef(language);
  const workerLanguageRef = useRef<BibleLanguage | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef(new Map<number, PendingChapter>());
  const pendingSearchRef = useRef(new Map<number, PendingSearch>());
  const loadGenerationRef = useRef(0);
  const readyRef = useRef(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [error, setError] = useState("");
  const [workerLanguage, setWorkerLanguage] = useState<BibleLanguage | null>(language);

  requestedLanguageRef.current = language;

  const requestChapter = useCallback((target: ChapterTarget, book: string, chapter: string) => {
    if (workerLanguageRef.current !== requestedLanguageRef.current) return Promise.resolve(null);
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

  const search = useCallback((query: string, limit = 30): Promise<SearchResult[] | null> => {
    if (workerLanguageRef.current !== requestedLanguageRef.current) return Promise.resolve(null);
    const requestId = ++requestIdRef.current;
    return dispatchSearchRequest(workerRef.current, readyRef.current, pendingSearchRef.current, requestId, query, limit);
  }, []);

  const cancelSearch = useCallback(() => {
    pendingSearchRef.current.forEach(({ resolve }) => resolve(null));
    pendingSearchRef.current.clear();
  }, []);

  const resolveAll = useCallback(() => {
    pendingRef.current.forEach(({ resolve }) => resolve(null));
    pendingRef.current.clear();
    cancelSearch();
  }, [cancelSearch]);

  useEffect(() => {
    const loadGeneration = ++loadGenerationRef.current;
    readyRef.current = false;
    resolveAll();
    setBooks([]);
    setStatus("loading");
    setError("");
    setWorkerLanguage(language);
    if (language === null) {
      workerLanguageRef.current = null;
      setStatus("idle");
      return;
    }
    const worker = new DataWorker();
    workerRef.current = worker;
    workerLanguageRef.current = language;
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (loadGeneration !== loadGenerationRef.current) return;
      if (data.type === "ready") {
        if (data.language !== language) return;
        readyRef.current = true;
        setBooks(data.books);
        setStatus("ready");
      } else if (data.type === "chapter") {
        pendingRef.current.get(data.requestId)?.resolve(data.verses);
        pendingRef.current.delete(data.requestId);
      } else if (data.type === "search") {
        pendingSearchRef.current.get(data.requestId)?.resolve(data.results);
      } else if (data.type === "search-error") {
        pendingSearchRef.current.get(data.requestId)?.resolve(null);
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
      if (loadGeneration !== loadGenerationRef.current) return;
      readyRef.current = false;
      workerLanguageRef.current = null;
      resolveAll();
      setError("AWMPC Bible could not start. Please reload and try again.");
      setStatus("error");
    };
    const baseUrl = new URL(import.meta.env.BASE_URL, document.baseURI).href;
    const dataBaseUrl = bibleDataBaseUrl(baseUrl);
    worker.postMessage({ type: "load", language, baseUrl, dataBaseUrl, datasetUrl: bibleDatasetUrl(language, baseUrl, dataBaseUrl) } satisfies WorkerRequest);
    return () => {
      if (loadGeneration === loadGenerationRef.current) loadGenerationRef.current += 1;
      readyRef.current = false;
      resolveAll();
      worker.terminate();
      workerRef.current = null;
    };
  }, [language, requestChapter, resolveAll]);

  const languageIsChanging = workerLanguage !== language;
  return {
    books: languageIsChanging ? [] : books,
    status: languageIsChanging ? "loading" : status,
    error: languageIsChanging ? "" : error,
    requestChapter,
    invalidate,
    search,
    cancelSearch,
  } as const;
}
