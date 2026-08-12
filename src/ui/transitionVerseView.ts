import { motionEasing, READER_FADE_DURATION_MS } from "./motion.ts";

const VERSE_SELECTED_INDICATOR_DURATION_MS = 7000;
const indicatorCleanups = new WeakMap<HTMLElement, () => void>();

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

function indicateSelectedVerse(target: HTMLElement | null): void {
  if (!target?.classList) return;
  indicatorCleanups.get(target)?.();
  target.classList.remove("verse-selected-indicator");
  void target.offsetWidth;
  const cleanup = () => {
    globalThis.clearTimeout(fallback);
    target.removeEventListener("animationend", onAnimationEnd);
    target.classList.remove("verse-selected-indicator");
    if (indicatorCleanups.get(target) === cleanup) indicatorCleanups.delete(target);
  };
  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.target === target && event.animationName === "selected-verse-indicator") cleanup();
  };
  const fallback = globalThis.setTimeout(cleanup, VERSE_SELECTED_INDICATOR_DURATION_MS + 250);
  target.addEventListener("animationend", onAnimationEnd);
  indicatorCleanups.set(target, cleanup);
  target.classList.add("verse-selected-indicator");
}

function centerTargetAfterScroll(target: HTMLElement | null): void {
  if (!target?.getBoundingClientRect || typeof window === "undefined") return;
  const center = () => {
    const box = target.getBoundingClientRect();
    const delta = box.top + box.height / 2 - window.innerHeight / 2;
    if (Math.abs(delta) > 8) window.scrollTo({ top: window.scrollY + delta, left: window.scrollX, behavior: "auto" });
  };
  requestAnimationFrame(() => {
    center();
    window.setTimeout(center, 180);
  });
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
      centerTargetAfterScroll(target);
      indicateSelectedVerse(target);
    } else {
      signal?.throwIfAborted();
      environment.scrollToTop();
      await fade(pane, 0, 1, signal);
      signal?.throwIfAborted();
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      centerTargetAfterScroll(target);
      indicateSelectedVerse(target);
    }
  } finally {
    pane.style.removeProperty("opacity");
  }
}

export async function transitionChapterView(
  pane: HTMLElement,
  commit: () => void,
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
    await environment.afterPaint();
    environment.scrollToTop();
    if (!reducedMotion) await fade(pane, 0, 1, signal);
  } finally {
    pane.style.removeProperty("opacity");
  }
}
