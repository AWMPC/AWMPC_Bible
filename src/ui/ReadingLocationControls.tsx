import type { RefObject } from "react";
import { createOverlayOrigin, type OverlayOrigin } from "./features";
import type { NavigationSection } from "./navigationTarget";
import type { BibleLanguage } from "../settings/bibleLanguage";
import { OverflowMarquee } from "./OverflowMarquee";

type ReadingLocationControlsProps = {
  book: string;
  secondaryBook?: string | null;
  secondaryLanguage?: BibleLanguage | null;
  chapter: string;
  visible: boolean;
  activeSection: NavigationSection | null;
  obscured: boolean;
  dockRef: RefObject<HTMLElement | null>;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  onNavigate: (section: NavigationSection, origin: OverlayOrigin, trigger: HTMLButtonElement) => void;
  onChapterNavigate: (direction: -1 | 1) => void;
};

type ReadingLocationEmbossProps = Pick<ReadingLocationControlsProps, "book" | "secondaryBook" | "secondaryLanguage" | "chapter"> & { visible: boolean };

export function ReadingLocationEmboss({ book, secondaryBook = null, secondaryLanguage = null, chapter, visible }: ReadingLocationEmbossProps) {
  return <p className={`reading-location-emboss${visible && book && chapter ? " is-visible" : ""}`} aria-hidden="true"><span>{book} · Chapter {chapter}</span>{secondaryBook && secondaryLanguage && <small lang={secondaryLanguage}>{secondaryBook}</small>}</p>;
}

export function ReadingLocationControls({ book, secondaryBook = null, secondaryLanguage = null, chapter, visible, activeSection, obscured, dockRef, canNavigatePrevious, canNavigateNext, onNavigate, onChapterNavigate }: ReadingLocationControlsProps) {
  const open = (section: NavigationSection, trigger: HTMLButtonElement) => {
    const dock = dockRef.current?.getBoundingClientRect();
    if (dock) onNavigate(section, createOverlayOrigin(trigger.getBoundingClientRect(), dock), trigger);
  };

  return (
    <nav className={`reading-location-controls${visible ? "" : " is-hidden"}${obscured ? " is-obscured" : ""}`} aria-label="Reading location" aria-hidden={obscured || undefined} inert={obscured}>
      <button className="reading-location-button book-location-button" type="button" disabled={!book} aria-label={`Choose book, currently ${book || "loading"}${secondaryBook ? `, ${secondaryBook}` : ""}`} aria-haspopup="dialog" aria-controls="feature-overlay" aria-expanded={activeSection === "books"} onClick={(event) => open("books", event.currentTarget)}><OverflowMarquee>{book || "Book"}</OverflowMarquee>{secondaryBook && secondaryLanguage && <small lang={secondaryLanguage}><OverflowMarquee>{secondaryBook}</OverflowMarquee></small>}</button>
      <div className="chapter-location-floater" aria-label="Chapter navigation">
        <button className="chapter-floater-arrow" type="button" disabled={!chapter || !canNavigatePrevious} aria-label="Previous chapter" onClick={() => onChapterNavigate(-1)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12H4M10 6l-6 6 6 6" /></svg></button>
        <button className="chapter-floater-current" type="button" disabled={!chapter} aria-label={`Choose chapter, currently chapter ${chapter || "loading"}`} aria-haspopup="dialog" aria-controls="feature-overlay" aria-expanded={activeSection === "chapters"} onClick={(event) => open("chapters", event.currentTarget)}>Chapter {chapter || ""}</button>
        <button className="chapter-floater-arrow" type="button" disabled={!chapter || !canNavigateNext} aria-label="Next chapter" onClick={() => onChapterNavigate(1)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16M14 6l6 6-6 6" /></svg></button>
      </div>
    </nav>
  );
}
