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
  onNavigate: (section: NavigationSection, origin: OverlayOrigin, trigger: HTMLButtonElement) => void;
};

export function ReadingLocationControls({ book, secondaryBook = null, secondaryLanguage = null, chapter, visible, activeSection, obscured, dockRef, onNavigate }: ReadingLocationControlsProps) {
  const open = (section: NavigationSection, trigger: HTMLButtonElement) => {
    const dock = dockRef.current?.getBoundingClientRect();
    if (dock) onNavigate(section, createOverlayOrigin(trigger.getBoundingClientRect(), dock), trigger);
  };

  return (
    <nav className={`reading-location-controls${visible ? "" : " is-hidden"}${obscured ? " is-obscured" : ""}`} aria-label="Reading location" aria-hidden={obscured || undefined} inert={obscured}>
      <button className="reading-location-button book-location-button" type="button" disabled={!book} aria-label={`Choose book, currently ${book || "loading"}${secondaryBook ? `, ${secondaryBook}` : ""}`} aria-haspopup="dialog" aria-controls="feature-overlay" aria-expanded={activeSection === "books"} onClick={(event) => open("books", event.currentTarget)}><OverflowMarquee>{book || "Book"}</OverflowMarquee>{secondaryBook && secondaryLanguage && <small lang={secondaryLanguage}><OverflowMarquee>{secondaryBook}</OverflowMarquee></small>}</button>
      <button className="reading-location-button chapter-location-button" type="button" disabled={!chapter} aria-label={`Choose chapter, currently chapter ${chapter || "loading"}`} aria-haspopup="dialog" aria-controls="feature-overlay" aria-expanded={activeSection === "chapters"} onClick={(event) => open("chapters", event.currentTarget)}>Chapter {chapter || ""}</button>
    </nav>
  );
}
