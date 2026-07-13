import { useEffect, type RefObject } from "react";
import type { ChapterDirection } from "../navigation/adjacentChapter";

const TOUCH_THRESHOLD_PX = 52;
const WHEEL_THRESHOLD_PX = 72;
const AXIS_DOMINANCE = 1.25;
const WHEEL_END_DELAY_MS = 180;
const TOUCH_MAX_DURATION_MS = 900;

type Point = Readonly<{ x: number; y: number }>;

export function horizontalSwipeDirection(start: Point, end: Point, elapsedMs = 0, threshold = TOUCH_THRESHOLD_PX): ChapterDirection | null {
  const horizontal = start.x - end.x;
  const vertical = start.y - end.y;
  if (![start.x, start.y, end.x, end.y, elapsedMs].every(Number.isFinite)
    || elapsedMs < 0
    || elapsedMs > TOUCH_MAX_DURATION_MS
    || Math.abs(horizontal) < threshold
    || Math.abs(horizontal) < Math.abs(vertical) * AXIS_DOMINANCE) return null;
  return horizontal > 0 ? 1 : -1;
}

export function horizontalWheelDirection(deltaX: number, deltaY: number, threshold = WHEEL_THRESHOLD_PX): ChapterDirection | null {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * AXIS_DOMINANCE) return null;
  return deltaX > 0 ? 1 : -1;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, [contenteditable='true'], [role='menu']"));
}

function wheelPixels(event: WheelEvent, pageWidth: number): Point {
  const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? pageWidth : 1;
  return { x: event.deltaX * multiplier, y: event.deltaY * multiplier };
}

export function useChapterSwipe(targetRef: RefObject<HTMLElement | null>, enabled: boolean, canNavigate: (direction: ChapterDirection) => boolean, onNavigate: (direction: ChapterDirection) => void): void {
  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return;

    let touchStart: Point | null = null;
    let touchStartedAt = 0;
    let touchIdentifier: number | null = null;
    let wheelX = 0;
    let wheelY = 0;
    let wheelLocked = false;
    let wheelEndTimer = 0;

    const clearWheel = () => {
      wheelX = 0;
      wheelY = 0;
      wheelLocked = false;
      wheelEndTimer = 0;
    };
    const scheduleWheelEnd = () => {
      window.clearTimeout(wheelEndTimer);
      wheelEndTimer = window.setTimeout(clearWheel, WHEEL_END_DELAY_MS);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (!event.isTrusted || event.touches.length !== 1 || isInteractiveTarget(event.target)) return;
      const touch = event.touches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
      touchStartedAt = performance.now();
      touchIdentifier = touch.identifier;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!event.isTrusted || touchStart === null || touchIdentifier === null) return;
      if (event.touches.length !== 1) {
        touchStart = null;
        touchIdentifier = null;
        return;
      }
      const touch = Array.from(event.touches).find(({ identifier }) => identifier === touchIdentifier);
      if (!touch) return;
      const horizontal = Math.abs(touch.clientX - touchStart.x);
      const vertical = Math.abs(touch.clientY - touchStart.y);
      const direction: ChapterDirection = touch.clientX < touchStart.x ? 1 : -1;
      if (horizontal > 10 && horizontal > vertical * AXIS_DOMINANCE && canNavigate(direction)) event.preventDefault();
    };
    const finishTouch = (event: TouchEvent) => {
      if (!event.isTrusted || touchStart === null || touchIdentifier === null) {
        touchStart = null;
        touchIdentifier = null;
        return;
      }
      const touch = Array.from(event.changedTouches).find(({ identifier }) => identifier === touchIdentifier);
      const start = touchStart;
      touchStart = null;
      touchIdentifier = null;
      if (!touch) return;
      const direction = horizontalSwipeDirection(start, { x: touch.clientX, y: touch.clientY }, performance.now() - touchStartedAt);
      if (direction && canNavigate(direction)) onNavigate(direction);
    };
    const cancelTouch = () => {
      touchStart = null;
      touchIdentifier = null;
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.isTrusted || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || isInteractiveTarget(event.target)) return;
      const delta = wheelPixels(event, window.innerWidth);
      wheelX += delta.x;
      wheelY += delta.y;
      scheduleWheelEnd();
      const tentativeDirection: ChapterDirection = wheelX > 0 ? 1 : -1;
      if (Math.abs(wheelX) > 10 && Math.abs(wheelX) > Math.abs(wheelY) * AXIS_DOMINANCE && canNavigate(tentativeDirection)) event.preventDefault();
      if (wheelLocked) return;
      const direction = horizontalWheelDirection(wheelX, wheelY);
      if (!direction) return;
      wheelLocked = true;
      if (canNavigate(direction)) onNavigate(direction);
    };

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: false });
    target.addEventListener("touchend", finishTouch, { passive: true });
    target.addEventListener("touchcancel", cancelTouch, { passive: true });
    target.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(wheelEndTimer);
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", finishTouch);
      target.removeEventListener("touchcancel", cancelTouch);
      target.removeEventListener("wheel", onWheel);
    };
  }, [canNavigate, enabled, onNavigate, targetRef]);
}
