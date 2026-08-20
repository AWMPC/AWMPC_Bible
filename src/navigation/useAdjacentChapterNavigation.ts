import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Book, Verse } from "../data/contracts";
import type { Passage } from "../data/useBibleLibrary";
import { transitionChapterView } from "../ui/transitionVerseView";
import { adjacentChapter, type ChapterDirection } from "./adjacentChapter";

type AdjacentChapterNavigationOptions = {
  enabled: boolean;
  books: readonly Book[];
  passage: Passage;
  readingPaneRef: RefObject<HTMLElement | null>;
  requestChapter: (target: "gesture", book: string, chapter: string) => Promise<Verse[] | null>;
  invalidate: (target: "gesture") => void;
  commit: (passage: Passage) => void;
  onStatus: (status: string) => void;
};

export function useAdjacentChapterNavigation(options: AdjacentChapterNavigationOptions) {
  const { enabled, books, passage, readingPaneRef, requestChapter, invalidate, commit, onStatus } = options;
  const generationRef = useRef(0);
  const processingRef = useRef(false);
  const queuedTargetsRef = useRef<Array<Pick<Passage, "book" | "chapter">>>([]);
  const queuedTailRef = useRef<Pick<Passage, "book" | "chapter"> | null>(null);
  const transitionAbortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setQueueVersion] = useState(0);

  const refreshQueue = useCallback(() => setQueueVersion((version) => version + 1), []);

  const cancel = useCallback(() => {
    if (!processingRef.current && transitionAbortRef.current === null) return;
    generationRef.current += 1;
    processingRef.current = false;
    queuedTargetsRef.current = [];
    queuedTailRef.current = null;
    transitionAbortRef.current?.abort();
    transitionAbortRef.current = null;
    invalidate("gesture");
    setLoading(false);
    refreshQueue();
  }, [invalidate, refreshQueue]);

  useEffect(() => {
    if (!enabled) cancel();
  }, [cancel, enabled]);

  useEffect(() => () => {
    generationRef.current += 1;
    processingRef.current = false;
    queuedTargetsRef.current = [];
    queuedTailRef.current = null;
    transitionAbortRef.current?.abort();
    transitionAbortRef.current = null;
    invalidate("gesture");
  }, [invalidate]);

  const canNavigate = useCallback((direction: ChapterDirection) => (
    enabled && adjacentChapter(books, queuedTailRef.current ?? passage, direction) !== null
  ), [books, enabled, passage]);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    const generation = generationRef.current;
    void (async () => {
      while (generation === generationRef.current) {
        const target = queuedTargetsRef.current.shift();
        if (!target) break;
        refreshQueue();
        onStatus(`Loading ${target.book} chapter ${target.chapter}.`);
        const transitionAbort = new AbortController();
        transitionAbortRef.current = transitionAbort;
        try {
          const verses = await requestChapter("gesture", target.book, target.chapter);
          if (generation !== generationRef.current) return;
          if (!verses?.length) {
            onStatus("That adjacent chapter could not be loaded.");
            continue;
          }
          const nextPassage = { ...target, verses };
          const pane = readingPaneRef.current;
          if (pane && queuedTargetsRef.current.length === 0) {
            await transitionChapterView(pane, () => commit(nextPassage), undefined, transitionAbort.signal);
          } else {
            commit(nextPassage);
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }
          if (generation === generationRef.current) onStatus(`${target.book} chapter ${target.chapter}.`);
        } catch (error: unknown) {
          if (generation === generationRef.current && !(error instanceof DOMException && error.name === "AbortError")) {
            onStatus("That adjacent chapter could not be loaded.");
          }
        } finally {
          if (transitionAbortRef.current === transitionAbort) transitionAbortRef.current = null;
        }
      }
    })().finally(() => {
      if (generation !== generationRef.current) return;
      processingRef.current = false;
      queuedTailRef.current = null;
      transitionAbortRef.current = null;
      setLoading(false);
      refreshQueue();
    });
  }, [commit, onStatus, readingPaneRef, refreshQueue, requestChapter]);

  const navigate = useCallback((direction: ChapterDirection) => {
    if (!enabled) return;
    const target = adjacentChapter(books, queuedTailRef.current ?? passage, direction);
    if (!target) return;
    queuedTargetsRef.current.push(target);
    queuedTailRef.current = target;
    refreshQueue();
    processQueue();
  }, [books, enabled, passage, processQueue, refreshQueue]);

  return { canNavigate, navigate, loading, cancel } as const;
}
