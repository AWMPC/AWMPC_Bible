import { useLayoutEffect, type RefObject } from "react";

export type ChapterScrollMetrics = Readonly<{
  viewportTop: number;
  viewportHeight: number;
  chapterTop: number;
  chapterHeight: number;
}>;

const PROGRESS_PROPERTY = "--chapter-progress";

export function chapterScrollProgress({ viewportTop, viewportHeight, chapterTop, chapterHeight }: ChapterScrollMetrics): number {
  if (![viewportTop, viewportHeight, chapterTop, chapterHeight].every(Number.isFinite)
    || viewportHeight <= 0
    || chapterHeight <= viewportHeight) return 0;

  const progress = (viewportTop - chapterTop) / (chapterHeight - viewportHeight);
  return Math.min(1, Math.max(0, progress));
}

export function useChapterScrollProgress(
  chapterRef: RefObject<HTMLElement | null>,
  outputRef: RefObject<HTMLElement | null>,
  passageKey: string,
): void {
  useLayoutEffect(() => {
    const output = outputRef.current;
    if (!output) return;
    const root = output.ownerDocument.documentElement;

    const chapter = chapterRef.current;
    output.style.setProperty(PROGRESS_PROPERTY, "0");
    root.style.setProperty(PROGRESS_PROPERTY, "0");
    if (!chapter) return () => {
      output.style.removeProperty(PROGRESS_PROPERTY);
      root.style.removeProperty(PROGRESS_PROPERTY);
    };

    let frame = 0;
    let lastProgress = 0;
    const writeProgress = (progress: number) => {
      const quantized = Number(progress.toFixed(4));
      if (quantized === lastProgress) return;
      lastProgress = quantized;
      output.style.setProperty(PROGRESS_PROPERTY, String(quantized));
      root.style.setProperty(PROGRESS_PROPERTY, String(quantized));
    };
    const measure = () => {
      frame = 0;
      if (!chapter.isConnected) return;
      const bounds = chapter.getBoundingClientRect();
      writeProgress(chapterScrollProgress({
        viewportTop: window.scrollY,
        viewportHeight: window.innerHeight,
        chapterTop: bounds.top + window.scrollY,
        chapterHeight: bounds.height,
      }));
    };
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    resizeObserver?.observe(chapter);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    scheduleMeasure();

    return () => {
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      resizeObserver?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      output.style.removeProperty(PROGRESS_PROPERTY);
      root.style.removeProperty(PROGRESS_PROPERTY);
    };
  }, [chapterRef, outputRef, passageKey]);
}
