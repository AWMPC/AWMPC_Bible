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
  const navigatingRef = useRef(false);
  const transitionAbortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);

  const cancel = useCallback(() => {
    if (!navigatingRef.current && transitionAbortRef.current === null) return;
    generationRef.current += 1;
    navigatingRef.current = false;
    transitionAbortRef.current?.abort();
    transitionAbortRef.current = null;
    invalidate("gesture");
    setLoading(false);
  }, [invalidate]);

  useEffect(() => {
    if (!enabled) cancel();
  }, [cancel, enabled]);

  useEffect(() => () => {
    generationRef.current += 1;
    navigatingRef.current = false;
    transitionAbortRef.current?.abort();
    transitionAbortRef.current = null;
    invalidate("gesture");
  }, [invalidate]);

  const canNavigate = useCallback((direction: ChapterDirection) => (
    enabled && !navigatingRef.current && adjacentChapter(books, passage, direction) !== null
  ), [books, enabled, passage]);

  const navigate = useCallback((direction: ChapterDirection) => {
    const target = adjacentChapter(books, passage, direction);
    if (!enabled || navigatingRef.current || !target) return;
    navigatingRef.current = true;
    setLoading(true);
    onStatus(`Loading ${target.book} chapter ${target.chapter}.`);
    const generation = ++generationRef.current;
    const transitionAbort = new AbortController();
    transitionAbortRef.current = transitionAbort;

    void requestChapter("gesture", target.book, target.chapter).then(async (verses) => {
      if (generation !== generationRef.current) return;
      if (!verses?.length) {
        onStatus("That adjacent chapter could not be loaded.");
        return;
      }
      const nextPassage = { ...target, verses };
      const pane = readingPaneRef.current;
      if (pane) {
        await transitionChapterView(pane, () => commit(nextPassage), undefined, transitionAbort.signal);
      } else {
        commit(nextPassage);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      if (generation === generationRef.current) onStatus(`${target.book} chapter ${target.chapter}.`);
    }).catch((error: unknown) => {
      if (generation === generationRef.current && !(error instanceof DOMException && error.name === "AbortError")) {
        onStatus("That adjacent chapter could not be loaded.");
      }
    }).finally(() => {
      if (generation === generationRef.current) {
        navigatingRef.current = false;
        transitionAbortRef.current = null;
        setLoading(false);
      }
    });
  }, [books, commit, enabled, onStatus, passage, readingPaneRef, requestChapter]);

  return { canNavigate, navigate, loading, cancel } as const;
}
