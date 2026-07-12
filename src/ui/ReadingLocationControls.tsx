import { createOverlayOrigin, type OverlayOrigin } from "./features";
import type { NavigationSection } from "./navigationTarget";

type ReadingLocationControlsProps = {
  book: string;
  chapter: string;
  visible: boolean;
  activeSection: NavigationSection | null;
  obscured: boolean;
  onNavigate: (section: NavigationSection, origin: OverlayOrigin, trigger: HTMLButtonElement) => void;
};

export function ReadingLocationControls({ book, chapter, visible, activeSection, obscured, onNavigate }: ReadingLocationControlsProps) {
  const open = (section: NavigationSection, trigger: HTMLButtonElement) => {
    const dock = document.querySelector<HTMLElement>(".floating-dock")?.getBoundingClientRect();
    if (dock) onNavigate(section, createOverlayOrigin(trigger.getBoundingClientRect(), dock), trigger);
  };

  return (
    <nav className={`reading-location-controls${visible ? "" : " is-hidden"}${obscured ? " is-obscured" : ""}`} aria-label="Reading location" aria-hidden={obscured || undefined} inert={obscured}>
      <button className="reading-location-button book-location-button" type="button" disabled={!book} aria-label={`Choose book, currently ${book || "loading"}`} aria-haspopup="dialog" aria-controls="feature-overlay" aria-expanded={activeSection === "books"} onClick={(event) => open("books", event.currentTarget)}>{book || "Book"}</button>
      <button className="reading-location-button chapter-location-button" type="button" disabled={!chapter} aria-label={`Choose chapter, currently chapter ${chapter || "loading"}`} aria-haspopup="dialog" aria-controls="feature-overlay" aria-expanded={activeSection === "chapters"} onClick={(event) => open("chapters", event.currentTarget)}>Chapter {chapter || ""}</button>
    </nav>
  );
}
