import type { Verse } from "../data/contracts";
import type { Passage } from "../data/useBibleLibrary";
import type { HistorySelection } from "../history/HistoryStore";
import type { ChooseVerseOptions, VerseLocation, VerseSelectionResult } from "./types";

export type VerseSelectionDependencies = {
  currentPassage: Passage;
  loadChapter: (book: string, chapter: string) => Promise<Verse[] | null>;
  isCurrent: () => boolean;
  recordHistory: (location: HistorySelection) => void;
  reveal: (nextPassage: Passage, targetVerse: string) => Promise<void>;
};

export async function runVerseSelection(
  location: VerseLocation,
  options: ChooseVerseOptions,
  dependencies: VerseSelectionDependencies,
): Promise<VerseSelectionResult> {
  try {
    const verses = options.prefetchedVerses
      ?? (dependencies.currentPassage.book === location.book && dependencies.currentPassage.chapter === location.chapter
        ? dependencies.currentPassage.verses
        : await dependencies.loadChapter(location.book, location.chapter));
    if (!dependencies.isCurrent() || !verses?.some((item) => item.number === location.verse)) return { status: "ignored" };
    if (options.recordHistory !== false) dependencies.recordHistory(options.historySelection ?? location);
    await dependencies.reveal({ book: location.book, chapter: location.chapter, verses }, location.verse);
    return { status: "selected" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { status: "ignored" };
    return { status: "failed", error };
  }
}
