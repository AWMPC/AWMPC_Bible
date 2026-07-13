import { useEffect, useRef, useState } from "react";
import { nearestNumericValue } from "../ui/middleVerse";
import type { BibleLanguage } from "./languages";
import type { Passage, LibraryStatus } from "./useBibleLibrary";
import { pairedBookName } from "./dualLanguage";
import type { Book, Verse } from "./contracts";

type SecondaryPassageOptions = {
  language: BibleLanguage | null;
  primaryBook: string;
  primaryChapter: string;
  primaryBooks: Book[];
  secondaryBooks: Book[];
  libraryStatus: LibraryStatus;
  requestChapter: (target: "reader", book: string, chapter: string) => Promise<Verse[] | null>;
  invalidate: (target: "reader") => void;
};

export type SecondaryPassageStatus = "idle" | "loading" | "ready" | "error";

export function useSecondaryPassage(options: SecondaryPassageOptions) {
  const [passage, setPassage] = useState<Passage | null>(null);
  const [status, setStatus] = useState<SecondaryPassageStatus>("idle");
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    options.invalidate("reader");
    setPassage(null);
    if (!options.language || !options.primaryBook || !options.primaryChapter) {
      setStatus("idle");
      return;
    }
    if (options.libraryStatus === "error") {
      setStatus("error");
      return;
    }
    if (options.libraryStatus !== "ready") {
      setStatus("loading");
      return;
    }
    const book = pairedBookName(options.primaryBook, options.primaryBooks, options.secondaryBooks);
    const chapters = book ? options.secondaryBooks.find(({ name }) => name === book)?.chapters ?? [] : [];
    const chapter = nearestNumericValue(chapters, options.primaryChapter);
    if (!book || !chapter) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    void options.requestChapter("reader", book, chapter).then((verses) => {
      if (generation !== generationRef.current) return;
      if (!verses) {
        setStatus("error");
        return;
      }
      setPassage({ book, chapter, verses });
      setStatus("ready");
    }).catch(() => {
      if (generation === generationRef.current) setStatus("error");
    });
  }, [options.language, options.primaryBook, options.primaryChapter, options.primaryBooks, options.secondaryBooks, options.libraryStatus, options.requestChapter, options.invalidate]);

  useEffect(() => () => {
    generationRef.current += 1;
    options.invalidate("reader");
  }, [options.invalidate]);

  return { passage, status } as const;
}
