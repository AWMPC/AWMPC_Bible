import type { RefObject } from "react";
import type { Verse } from "../data/contracts";
import type { LibraryStatus } from "../data/useBibleLibrary";
import type { BibleLanguage } from "../settings/bibleLanguage";
import { verseElementId } from "./transitionVerseView";
import { Skeleton } from "./Skeleton";
import { VerseWithFootnotes } from "./VerseWithFootnotes";
import type { VerseActionTarget } from "./VerseActionsMenu";

type ReaderPassageViewProps = {
  readingPaneRef: RefObject<HTMLElement | null>;
  chapterRef: RefObject<HTMLElement | null>;
  chapterSwipeLoading: boolean;
  primaryStatus: LibraryStatus;
  primaryError: string;
  primaryLanguage: BibleLanguage;
  book: string;
  chapter: string;
  verses: Verse[];
  secondaryLanguage: BibleLanguage | null;
  secondaryStatus: LibraryStatus;
  secondaryBook: string | undefined;
  secondaryChapter: string | undefined;
  secondaryVerses: ReadonlyMap<string, Verse>;
  languageLabels: ReadonlyMap<BibleLanguage, string>;
  verseActionTarget: VerseActionTarget | null;
  onVerseActions: (verse: Verse, trigger: HTMLButtonElement, language: BibleLanguage, book: string, chapter: string) => void;
};

export function ReaderPassageView({ readingPaneRef, chapterRef, chapterSwipeLoading, primaryStatus, primaryError, primaryLanguage, book, chapter, verses, secondaryLanguage, secondaryStatus, secondaryBook, secondaryChapter, secondaryVerses, languageLabels, verseActionTarget, onVerseActions }: ReaderPassageViewProps) {
  const dualLanguage = secondaryLanguage !== null;
  return (
    <main
      ref={readingPaneRef}
      id="reading-pane"
      className="reading-pane"
      tabIndex={-1}
      aria-busy={chapterSwipeLoading || undefined}
    >
      {primaryStatus === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{primaryError}</p></section> : (
        primaryStatus === "loading" || verses.length === 0 ? <Skeleton rows={8} text /> : (
          <article ref={chapterRef} aria-label={`${book} chapter ${chapter}`}>
            <ol className="verses">{verses.map((verse) => {
              const secondaryVerse = secondaryVerses.get(verse.number);
              return (
                <li id={verseElementId(chapter, verse.number)} data-verse-number={verse.number} key={`${book}-${chapter}-${verse.number}`}>
                  <VerseWithFootnotes key={`${primaryLanguage}:${verse.number}`} verse={verse} language={primaryLanguage} actionLanguageLabel={dualLanguage ? languageLabels.get(primaryLanguage) : undefined} actionsOpen={verseActionTarget?.bibleLanguage === primaryLanguage && verseActionTarget.verse.number === verse.number} onActions={(targetVerse, trigger) => onVerseActions(targetVerse, trigger, primaryLanguage, book, chapter)} />
                  {secondaryLanguage && secondaryStatus === "loading" && <div className="verse-language-row secondary-verse-skeleton" lang={secondaryLanguage} aria-hidden="true"><div className="verse-rail" /><div className="verse-content" /></div>}
                  {secondaryLanguage && secondaryBook && secondaryChapter && secondaryVerse && <VerseWithFootnotes key={`${secondaryLanguage}:${verse.number}`} verse={secondaryVerse} language={secondaryLanguage} actionLanguageLabel={languageLabels.get(secondaryLanguage)} actionsOpen={verseActionTarget?.bibleLanguage === secondaryLanguage && verseActionTarget.verse.number === secondaryVerse.number} onActions={(targetVerse, trigger) => onVerseActions(targetVerse, trigger, secondaryLanguage, secondaryBook, secondaryChapter)} />}
                </li>
              );
            })}</ol>
            {secondaryLanguage && secondaryStatus === "error" && <p className="secondary-language-error" role="status">The secondary Bible text is unavailable for this passage.</p>}
          </article>
        )
      )}
    </main>
  );
}
