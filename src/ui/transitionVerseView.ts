export type VerseTransitionEnvironment = Readonly<{
  prefersReducedMotion: () => boolean;
  afterPaint: () => Promise<void>;
  scrollToTop: () => void;
  findTarget: (id: string) => HTMLElement | null;
}>;

const FADE_DURATION_MS = 180;
const FALLBACK_EASING = "cubic-bezier(.42, 0, .58, 1)";

function browserEnvironment(): VerseTransitionEnvironment {
  return {
    prefersReducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    afterPaint: () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    scrollToTop: () => window.scrollTo({ top: 0, left: 0, behavior: "auto" }),
    findTarget: (id) => document.getElementById(id),
  };
}

function motionEasing(): string {
  if (typeof getComputedStyle === "undefined") return FALLBACK_EASING;
  return getComputedStyle(document.documentElement).getPropertyValue("--motion-easing").trim() || FALLBACK_EASING;
}

async function fade(pane: HTMLElement, from: number, to: number): Promise<void> {
  const animation = pane.animate([{ opacity: from }, { opacity: to }], {
    duration: FADE_DURATION_MS,
    easing: motionEasing(),
    fill: "forwards",
  });
  await animation.finished.catch(() => undefined);
  animation.cancel();
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
): Promise<void> {
  const reducedMotion = environment.prefersReducedMotion();
  try {
    if (!reducedMotion) await fade(pane, 1, 0);
    pane.style.opacity = "0";
    commit();
    await closeOverlay();
    await environment.afterPaint();
    const target = environment.findTarget(targetId);
    if (reducedMotion) {
      target?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    } else {
      environment.scrollToTop();
      await fade(pane, 0, 1);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  } finally {
    pane.style.removeProperty("opacity");
  }
}
