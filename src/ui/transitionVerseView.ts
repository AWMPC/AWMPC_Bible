import { motionEasing, READER_FADE_DURATION_MS } from "./motion.ts";

export type VerseTransitionEnvironment = Readonly<{
  prefersReducedMotion: () => boolean;
  afterPaint: () => Promise<void>;
  scrollToTop: () => void;
  findTarget: (id: string) => HTMLElement | null;
}>;

function browserEnvironment(): VerseTransitionEnvironment {
  return {
    prefersReducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    afterPaint: () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    scrollToTop: () => window.scrollTo({ top: 0, left: 0, behavior: "auto" }),
    findTarget: (id) => document.getElementById(id),
  };
}

async function fade(pane: HTMLElement, from: number, to: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const animation = pane.animate([{ opacity: from }, { opacity: to }], {
    duration: READER_FADE_DURATION_MS,
    easing: motionEasing(),
    fill: "forwards",
  });
  const cancel = () => animation.cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    await animation.finished.catch(() => undefined);
    signal?.throwIfAborted();
  } finally {
    signal?.removeEventListener("abort", cancel);
    animation.cancel();
  }
}

export function verseElementId(chapter: string, verse: string): string {
  return `verse-${chapter}-${verse}`;
}

export async function transitionVerseView(
  pane: HTMLElement,
  targetId: string,
  commit: () => void,
  closeOverlay: () => Promise<void>,
  environment: VerseTransitionEnvironment = browserEnvironment(),
  signal?: AbortSignal,
): Promise<void> {
  const reducedMotion = environment.prefersReducedMotion();
  try {
    signal?.throwIfAborted();
    if (!reducedMotion) await fade(pane, 1, 0, signal);
    signal?.throwIfAborted();
    pane.style.opacity = "0";
    commit();
    await closeOverlay();
    signal?.throwIfAborted();
    await environment.afterPaint();
    signal?.throwIfAborted();
    const target = environment.findTarget(targetId);
    if (reducedMotion) {
      signal?.throwIfAborted();
      target?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    } else {
      signal?.throwIfAborted();
      environment.scrollToTop();
      await fade(pane, 0, 1, signal);
      signal?.throwIfAborted();
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  } finally {
    pane.style.removeProperty("opacity");
  }
}
