import { useCallback, useMemo, useRef, useState } from "react";
import type { Book, Verse } from "../data/contracts";
import type { Passage } from "../data/useBibleLibrary";

type NavigationStatus = "idle" | "loading" | "ready" | "error";

export type StagedNavigationState = Readonly<{
  book: string;
  chapter: string;
  verses: Verse[];
  status: NavigationStatus;
  error: string;
}>;

const EMPTY_STATE: StagedNavigationState = { book: "", chapter: "", verses: [], status: "idle", error: "" };

export function stagedNavigationFrom(passage: Passage): StagedNavigationState {
  return { ...passage, status: "ready", error: "" };
}

export function completeStagedNavigation(current: StagedNavigationState, verses: Verse[] | null): StagedNavigationState {
  return verses
    ? { ...current, verses, status: "ready", error: "" }
    : { ...current, verses: [], status: "error", error: "That chapter could not be loaded." };
}

export function useStagedNavigation(
  books: Book[],
  requestChapter: (target: "navigation", book: string, chapter: string) => Promise<Verse[] | null>,
  invalidate: (target: "navigation") => void,
) {
  const generationRef = useRef(0);
  const [state, setState] = useState<StagedNavigationState>(EMPTY_STATE);
  const chapters = useMemo(() => books.find((item) => item.name === state.book)?.chapters ?? [], [books, state.book]);

  const load = useCallback(async (book: string, chapter: string, generation: number) => {
    const verses = await requestChapter("navigation", book, chapter);
    if (generation !== generationRef.current) return;
    setState((current) => completeStagedNavigation(current, verses));
  }, [requestChapter]);

  const openFrom = useCallback((passage: Passage) => {
    generationRef.current += 1;
    invalidate("navigation");
    setState(stagedNavigationFrom(passage));
  }, [invalidate]);

  const chooseBook = useCallback((book: string) => {
    const chapter = books.find((item) => item.name === book)?.chapters[0];
    if (!chapter) return;
    const generation = ++generationRef.current;
    setState({ book, chapter, verses: [], status: "loading", error: "" });
    void load(book, chapter, generation);
  }, [books, load]);

  const chooseChapter = useCallback((chapter: string) => {
    const generation = ++generationRef.current;
    setState((current) => ({ ...current, chapter, verses: [], status: "loading", error: "" }));
    void load(state.book, chapter, generation);
  }, [load, state.book]);

  const abandon = useCallback(() => {
    generationRef.current += 1;
    invalidate("navigation");
  }, [invalidate]);

  return { state, chapters, openFrom, chooseBook, chooseChapter, abandon } as const;
}
