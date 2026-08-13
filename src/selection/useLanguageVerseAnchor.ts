import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Book, Verse } from "../data/contracts";
import type { LibraryStatus, Passage } from "../data/useBibleLibrary";
import type { BibleLanguage } from "../settings/bibleLanguage";
import { middleVerseNumber, nearestNumericValue } from "../ui/middleVerse";
import { verseElementId } from "../ui/transitionVerseView";

type PendingAnchor = Readonly<{
  generation: number;
  language: BibleLanguage;
  bookIndex: number;
  chapter: string;
  verse: string;
}>;

type LanguageVerseAnchorOptions = {
  language: BibleLanguage;
  books: Book[];
  passage: Passage;
  chapterRef: RefObject<HTMLElement | null>;
  libraryStatus: LibraryStatus;
  requestChapter: (target: "reader", book: string, chapter: string) => Promise<Verse[] | null>;
  commit: (passage: Passage) => void;
  updateLanguage: (language: BibleLanguage) => void;
};

export function useLanguageVerseAnchor(options: LanguageVerseAnchorOptions) {
  const { language, books, passage, chapterRef, libraryStatus, requestChapter, commit, updateLanguage } = options;
  const pendingRef = useRef<PendingAnchor | null>(null);
  const postOverlayAnchorRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const frameRef = useRef(0);
  const [restoring, setRestoring] = useState(false);

  const changeLanguage = useCallback((nextLanguage: BibleLanguage) => {
    if (nextLanguage === language) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const bookIndex = books.findIndex(({ name }) => name === passage.book);
    const verse = middleVerseNumber(chapterRef.current);
    const generation = ++generationRef.current;
    pendingRef.current = bookIndex >= 0 && passage.chapter && verse
      ? { generation, language: nextLanguage, bookIndex, chapter: passage.chapter, verse }
      : null;
    setRestoring(pendingRef.current !== null);
    updateLanguage(nextLanguage);
  }, [books, chapterRef, language, passage.book, passage.chapter, updateLanguage]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pending.language !== language || libraryStatus !== "ready") return;
    const targetBook = books[pending.bookIndex];
    const targetChapter = targetBook && nearestNumericValue(targetBook.chapters, pending.chapter);
    if (!targetBook || !targetChapter) {
      pendingRef.current = null;
      setRestoring(false);
      return;
    }

    let cancelled = false;
    void requestChapter("reader", targetBook.name, targetChapter).then((verses) => {
      if (cancelled || pending.generation !== generationRef.current || pending.language !== language) return;
      const targetVerse = verses && nearestNumericValue(verses.map(({ number }) => number), pending.verse);
      if (!verses || !targetVerse) {
        pendingRef.current = null;
        setRestoring(false);
        return;
      }
      commit({ book: targetBook.name, chapter: targetChapter, verses });
      pendingRef.current = null;
      setRestoring(false);
      const targetId = verseElementId(targetChapter, targetVerse);
      postOverlayAnchorRef.current = targetId;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
        });
      });
    }).catch(() => {
      if (!cancelled && pending.generation === generationRef.current) {
        pendingRef.current = null;
        setRestoring(false);
      }
    });
    return () => { cancelled = true; };
  }, [books, commit, language, libraryStatus, requestChapter]);

  useEffect(() => () => {
    generationRef.current += 1;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  const restoreAfterOverlayClose = useCallback(() => {
    const targetId = postOverlayAnchorRef.current;
    postOverlayAnchorRef.current = null;
    if (!targetId) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      });
    });
  }, []);

  return { changeLanguage, restoreAfterOverlayClose, restoring } as const;
}
