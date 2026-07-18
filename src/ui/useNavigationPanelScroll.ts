import { useCallback, useEffect, useRef, type RefObject } from "react";
import { scrollNavigationSection, type NavigationScrollAlignment } from "./navigationScroll";
import type { NavigationSectionRequest } from "./navigationTarget";

type NavigationPanelScrollOptions = {
  booksRef: RefObject<HTMLElement | null>;
  chaptersRef: RefObject<HTMLElement | null>;
  versesRef: RefObject<HTMLElement | null>;
  scrollContainerRef: RefObject<HTMLElement | null>;
  initialLoading: boolean;
  sectionRequest?: NavigationSectionRequest | null;
  versesLoading: boolean;
  versesLength: number;
  onBook: (book: string) => void;
  onChapter: (chapter: string) => void;
};

export function useNavigationPanelScroll({ booksRef, chaptersRef, versesRef, scrollContainerRef, initialLoading, sectionRequest, versesLoading, versesLength, onBook, onChapter }: NavigationPanelScrollOptions) {
  const scrollFrameRef = useRef(0);
  const pendingVersesScrollRef = useRef(false);

  const scheduleScroll = useCallback((target: HTMLElement | null, alignment: NavigationScrollAlignment = "start") => {
    cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container && target) {
        scrollNavigationSection(container, target, window.matchMedia("(prefers-reduced-motion: reduce)").matches, alignment);
      }
    });
  }, [scrollContainerRef]);

  useEffect(() => () => cancelAnimationFrame(scrollFrameRef.current), []);

  useEffect(() => {
    if (initialLoading || !sectionRequest) return;
    const section = sectionRequest.section === "books" ? booksRef.current : chaptersRef.current;
    const selected = section?.querySelector<HTMLElement>('button[aria-current="page"]') ?? null;
    scheduleScroll(selected ?? section, "center");
  }, [booksRef, chaptersRef, initialLoading, scheduleScroll, sectionRequest]);

  useEffect(() => {
    if (!pendingVersesScrollRef.current || versesLoading) return;
    pendingVersesScrollRef.current = false;
    scheduleScroll(versesRef.current, "start");
  }, [scheduleScroll, versesLength, versesLoading, versesRef]);

  const chooseBook = useCallback((nextBook: string) => {
    onBook(nextBook);
    scheduleScroll(chaptersRef.current);
  }, [chaptersRef, onBook, scheduleScroll]);

  const chooseChapter = useCallback((nextChapter: string) => {
    pendingVersesScrollRef.current = true;
    onChapter(nextChapter);
  }, [onChapter]);

  return { chooseBook, chooseChapter } as const;
}
