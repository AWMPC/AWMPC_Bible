export type ScrollContainer = Pick<HTMLElement, "scrollTop" | "getBoundingClientRect" | "scrollTo">;
export type ScrollTarget = Pick<HTMLElement, "getBoundingClientRect">;

export function scrollNavigationSection(container: ScrollContainer, target: ScrollTarget, reducedMotion: boolean): void {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  container.scrollTo({
    top: Math.max(0, container.scrollTop + targetRect.top - containerRect.top),
    behavior: reducedMotion ? "auto" : "smooth",
  });
}
