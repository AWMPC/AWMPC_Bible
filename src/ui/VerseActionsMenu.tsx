import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Verse } from "../data/contracts";
import { createVerseLink, formatVerseForCopy } from "../links/verseLinks";
import type { BibleLanguage } from "../settings/bibleLanguage";
import { copyPlainText } from "./clipboard";
import { MOTION_DURATION_MS } from "./motion";

export type VerseActionTarget = Readonly<{
  bibleLanguage: BibleLanguage;
  book: string;
  chapter: string;
  verse: Verse;
  trigger: HTMLButtonElement;
}>;

type VerseActionsMenuProps = {
  target: VerseActionTarget | null;
  onClose: (restoreFocus: boolean) => void;
  onStatus: (message: string) => void;
};

export function VerseActionsMenu({ target, onClose, onStatus }: VerseActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [renderedTarget, setRenderedTarget] = useState(target);

  useLayoutEffect(() => {
    if (target) {
      setRenderedTarget(target);
      return;
    }
    if (!renderedTarget) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRenderedTarget(null), reducedMotion ? 0 : MOTION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [renderedTarget, target]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!target || !renderedTarget || !menu) return;
    const trigger = renderedTarget.trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const gap = 8;
    const left = Math.min(window.innerWidth - bounds.width - gap, Math.max(gap, trigger.left));
    const below = trigger.bottom + gap;
    const top = below + bounds.height <= window.innerHeight - gap ? below : Math.max(gap, trigger.top - bounds.height - gap);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.transformOrigin = `${trigger.left + trigger.width / 2 - left}px ${trigger.top + trigger.height / 2 - top}px`;
    menu.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [renderedTarget, target]);

  useEffect(() => {
    if (!target) return;
    let dismissViewportChanges = false;
    const readyFrame = requestAnimationFrame(() => { dismissViewportChanges = true; });
    const dismissPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && event.target !== target.trigger) onClose(false);
    };
    const dismissKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
      }
    };
    const dismissViewportChange = () => {
      if (dismissViewportChanges) onClose(false);
    };
    document.addEventListener("pointerdown", dismissPointer, true);
    document.addEventListener("keydown", dismissKey);
    window.addEventListener("resize", dismissViewportChange, { passive: true });
    window.addEventListener("scroll", dismissViewportChange, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(readyFrame);
      document.removeEventListener("pointerdown", dismissPointer, true);
      document.removeEventListener("keydown", dismissKey);
      window.removeEventListener("resize", dismissViewportChange);
      window.removeEventListener("scroll", dismissViewportChange, true);
    };
  }, [onClose, target]);

  if (!renderedTarget) return null;

  const copy = async (kind: "verse" | "link") => {
    if (!target) return;
    try {
      const text = kind === "verse"
        ? formatVerseForCopy({ book: target.book, chapter: target.chapter, verse: target.verse.number, text: target.verse.text })
        : createVerseLink({ bibleLanguage: target.bibleLanguage, book: target.book, chapter: target.chapter, verse: target.verse.number }, window.location.href);
      await copyPlainText(text);
      onStatus(kind === "verse" ? "Verse copied." : "Verse link copied.");
    } catch {
      onStatus("Unable to copy. Check this browser's clipboard permission.");
    } finally {
      onClose(true);
    }
  };

  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={menuRef} id="verse-actions-menu" className={`verse-actions-menu ${target ? "is-opening" : "is-closing"}`} role="menu" aria-label={`${renderedTarget.book} ${renderedTarget.chapter}:${renderedTarget.verse.number} actions`} aria-hidden={!target || undefined} inert={!target} onKeyDown={moveFocus}>
      <button type="button" role="menuitem" onClick={() => void copy("verse")}>Copy Verse</button>
      <button type="button" role="menuitem" onClick={() => void copy("link")}>Copy Link</button>
    </div>
  );
}
