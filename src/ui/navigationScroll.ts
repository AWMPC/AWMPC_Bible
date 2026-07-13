export type ScrollContainer = Pick<HTMLElement, "scrollTo" | "scrollTop" | "clientHeight" | "scrollHeight" | "getBoundingClientRect">;
export type ScrollTarget = Pick<HTMLElement, "getBoundingClientRect" | "offsetTop" | "offsetHeight" | "offsetParent">;
export type NavigationScrollAlignment = "start" | "center";

export function scrollNavigationSection(container: ScrollContainer, target: ScrollTarget, reducedMotion: boolean, alignment: NavigationScrollAlignment = "start"): void {
  let targetTop = 0;
  const containerNode = container as unknown as Pick<HTMLElement, "offsetTop" | "offsetParent">;
  let current: Pick<HTMLElement, "offsetTop" | "offsetParent"> | null = target;
  while (current && current !== containerNode) {
    targetTop += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  if (current !== containerNode) {
    const containerRect = container.getBoundingClientRect();
    targetTop = container.scrollTop + target.getBoundingClientRect().top - containerRect.top;
  }
  const alignedTop = alignment === "center" ? targetTop - (container.clientHeight - target.offsetHeight) / 2 : targetTop;
  container.scrollTo({
    top: Math.min(Math.max(0, alignedTop), Math.max(0, container.scrollHeight - container.clientHeight)),
    behavior: reducedMotion ? "auto" : "smooth",
  });
}
