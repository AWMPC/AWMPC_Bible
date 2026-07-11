import type { Verse } from "../data/contracts";
import type { Passage } from "../data/useBibleLibrary";
import type { ChooseVerseOptions, VerseLocation } from "./types";

export type VerseSelectionDependencies = {
  currentPassage: Passage;
  loadChapter: (book: string, chapter: string) => Promise<Verse[] | null>;
  isCurrent: () => boolean;
  recordHistory: (location: VerseLocation) => void;
  reveal: (nextPassage: Passage, targetVerse: string) => Promise<void>;
};

export async function runVerseSelection(
  location: VerseLocation,
  options: ChooseVerseOptions,
  dependencies: VerseSelectionDependencies,
): Promise<boolean> {
  const verses = options.prefetchedVerses
    ?? (dependencies.currentPassage.book === location.book && dependencies.currentPassage.chapter === location.chapter
      ? dependencies.currentPassage.verses
      : await dependencies.loadChapter(location.book, location.chapter));
  if (!dependencies.isCurrent() || !verses?.some((item) => item.number === location.verse)) return false;
  if (options.recordHistory !== false) dependencies.recordHistory(location);
  await dependencies.reveal({ book: location.book, chapter: location.chapter, verses }, location.verse);
  return true;
}
