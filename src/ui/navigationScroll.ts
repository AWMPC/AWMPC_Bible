export type ScrollContainer = Pick<HTMLElement, "scrollTo">;
export type ScrollTarget = Pick<HTMLElement, "offsetTop">;

export function scrollNavigationSection(container: ScrollContainer, target: ScrollTarget, reducedMotion: boolean): void {
  container.scrollTo({
    top: Math.max(0, target.offsetTop),
    behavior: reducedMotion ? "auto" : "smooth",
  });
}
