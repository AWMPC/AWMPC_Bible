import { useCallback, useRef, type RefObject } from "react";
import type { Verse } from "../data/contracts";
import type { Passage } from "../data/useBibleLibrary";
import type { HistorySelection } from "../history/HistoryStore";
import { transitionVerseView, verseElementId } from "../ui/transitionVerseView";
import { runVerseSelection } from "./runVerseSelection";
import type { ChooseVerseOptions, VerseLocation } from "./types";

export type { ChooseVerseOptions, VerseLocation } from "./types";

type ChooseVerseDependencies = {
  passage: Passage;
  readingPaneRef: RefObject<HTMLElement | null>;
  requestChapter: (target: "selection", book: string, chapter: string) => Promise<Verse[] | null>;
  cancelRequest: () => void;
  commit: (passage: Passage) => void;
  recordHistory: (selection: HistorySelection) => void;
  closeOverlay: () => Promise<void>;
};

export function useChooseVerse({ passage, readingPaneRef, requestChapter, cancelRequest, commit, recordHistory, closeOverlay }: ChooseVerseDependencies) {
  const generationRef = useRef(0);
  const selectingRef = useRef(false);
  const transitionAbortRef = useRef<AbortController | null>(null);

  const chooseVerse = useCallback(async (location: VerseLocation, options: ChooseVerseOptions = {}) => {
    if (selectingRef.current) return;
    selectingRef.current = true;
    const generation = ++generationRef.current;
    const transitionAbort = new AbortController();
    transitionAbortRef.current = transitionAbort;
    try {
      await runVerseSelection(location, options, {
        currentPassage: passage,
        loadChapter: (book, chapter) => requestChapter("selection", book, chapter),
        isCurrent: () => generation === generationRef.current,
        recordHistory,
        reveal: async (nextPassage, verse) => {
          const pane = readingPaneRef.current;
          if (pane) await transitionVerseView(pane, verseElementId(nextPassage.chapter, verse), () => commit(nextPassage), closeOverlay, undefined, transitionAbort.signal);
          else {
            commit(nextPassage);
            await closeOverlay();
          }
        },
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    } finally {
      if (generation === generationRef.current) {
        selectingRef.current = false;
        transitionAbortRef.current = null;
      }
    }
  }, [closeOverlay, commit, passage, readingPaneRef, recordHistory, requestChapter]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    selectingRef.current = false;
    transitionAbortRef.current?.abort();
    transitionAbortRef.current = null;
    cancelRequest();
  }, [cancelRequest]);

  return { chooseVerse, cancel } as const;
}
