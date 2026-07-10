import { useCallback, useEffect, useRef, useState } from "react";

export type ScrollIntent = Readonly<{ direction: -1 | 1; recordedAt: number }>;

export function nextDockVisibility(
  visible: boolean,
  previousY: number,
  currentY: number,
  intent: ScrollIntent | null,
  now: number,
): boolean {
  if (!intent || now - intent.recordedAt > 700) return visible;
  const delta = currentY - previousY;
  if (Math.abs(delta) < 5 || Math.sign(delta) !== intent.direction) return visible;
  if (currentY <= 8) return true;
  return delta < 0;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
  );
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".feature-overlay, .dock-scroll"));
}

export type DockVisibility = Readonly<{
  visible: boolean;
  toggle: () => void;
}>;

export function useUserScrollDockVisibility(enabled: boolean): DockVisibility {
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  const previousY = useRef(0);
  const touchY = useRef<number | null>(null);
  const intent = useRef<ScrollIntent | null>(null);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    previousY.current = window.scrollY;
    if (!enabled) {
      intent.current = null;
      setVisible(true);
      return;
    }

    const recordIntent = (direction: -1 | 1) => {
      intent.current = { direction, recordedAt: performance.now() };
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.isTrusted || isIgnoredTarget(event.target) || Math.abs(event.deltaY) < 2) return;
      recordIntent(event.deltaY > 0 ? 1 : -1);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (!event.isTrusted || isIgnoredTarget(event.target)) return;
      touchY.current = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const current = event.touches[0]?.clientY;
      if (!event.isTrusted || current === undefined || touchY.current === null || isIgnoredTarget(event.target)) return;
      const delta = touchY.current - current;
      touchY.current = current;
      if (Math.abs(delta) >= 3) recordIntent(delta > 0 ? 1 : -1);
    };
    const clearTouch = () => { touchY.current = null; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.isTrusted || event.altKey || event.ctrlKey || event.metaKey || isInteractiveTarget(event.target)) return;
      const down = ["ArrowDown", "PageDown", "End"].includes(event.key) || (event.key === " " && !event.shiftKey);
      const up = ["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey);
      if (down || up) recordIntent(down ? 1 : -1);
    };
    const onScroll = () => {
      const currentY = window.scrollY;
      const next = nextDockVisibility(visibleRef.current, previousY.current, currentY, intent.current, performance.now());
      previousY.current = currentY;
      if (next !== visibleRef.current) {
        visibleRef.current = next;
        setVisible(next);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", clearTouch, { passive: true });
    window.addEventListener("touchcancel", clearTouch, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", clearTouch);
      window.removeEventListener("touchcancel", clearTouch);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled]);

  const toggle = useCallback(() => {
    if (!enabled) return;
    setVisible((current) => {
      const next = !current;
      visibleRef.current = next;
      return next;
    });
  }, [enabled]);

  return { visible, toggle };
}
