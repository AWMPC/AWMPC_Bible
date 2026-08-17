import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { OverlayOrigin } from "./features";
import { motionEasing, MOTION_DURATION_MS } from "./motion";
import { lockDocumentScroll } from "./scrollLock";

export type OverlayPhase = "closed" | "opening" | "open" | "closing";

type UseOverlayLifecycleOptions = {
  active: boolean;
  origin: OverlayOrigin | null;
  onCloseStart: () => void;
  onClose: () => void;
  dialogRef: RefObject<HTMLDialogElement | null>;
  surfaceRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
};

function overlayFrames(dialog: HTMLDialogElement, origin: OverlayOrigin): Keyframe[] {
  const target = dialog.getBoundingClientRect();
  const offsetX = origin.x + origin.width / 2 - (target.x + target.width / 2);
  const offsetY = origin.y + origin.height / 2 - (target.y + target.height / 2);
  return [
    {
      opacity: 0.72,
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${origin.width / target.width}, ${origin.height / target.height})`,
      borderRadius: "16px",
    },
    { opacity: 1, transform: "translate(0, 0) scale(1)", borderRadius: "30px" },
  ];
}

function startAnimations(dialog: HTMLDialogElement, surface: HTMLElement | null, origin: OverlayOrigin): Animation[] {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return [];
  const timing: KeyframeAnimationOptions = { duration: MOTION_DURATION_MS, easing: motionEasing() };
  return [
    dialog.animate(overlayFrames(dialog, origin), timing),
    surface?.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "scale(1)" }], timing),
  ].filter((animation): animation is Animation => Boolean(animation));
}

async function waitForAnimations(animations: Animation[]): Promise<void> {
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}

export function useOverlayLifecycle({ active, origin, onCloseStart, onClose, dialogRef, surfaceRef, initialFocusRef }: UseOverlayLifecycleOptions) {
  const originRef = useRef<OverlayOrigin | null>(origin);
  const animationsRef = useRef<Animation[]>([]);
  const releaseScrollRef = useRef<(() => void) | null>(null);
  const closeGenerationRef = useRef(0);
  const phaseRef = useRef<OverlayPhase>("closed");
  const [phase, setPhaseState] = useState<OverlayPhase>("closed");

  const setPhase = useCallback((next: OverlayPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => { originRef.current = origin; }, [origin]);

  const close = useCallback(async () => {
    const dialog = dialogRef.current;
    const currentOrigin = originRef.current;
    if (!dialog?.open || !currentOrigin || phaseRef.current === "closing") return;

    onCloseStart();
    setPhase("closing");
    const closeGeneration = ++closeGenerationRef.current;
    let animations = animationsRef.current.filter((animation) => animation.playState !== "idle");
    if (animations.length) {
      animations.forEach((animation) => animation.reverse());
    } else {
      animations = startAnimations(dialog, surfaceRef.current, currentOrigin);
      animations.forEach((animation) => {
        animation.currentTime = animation.effect?.getTiming().duration as number;
        animation.reverse();
      });
    }
    animationsRef.current = animations;
    await waitForAnimations(animations);
    if (closeGeneration !== closeGenerationRef.current) return;
    onClose();
    dialog.close();
    animationsRef.current = [];
    setPhase("closed");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, [dialogRef, onClose, onCloseStart, setPhase, surfaceRef]);

  const keepOpen = useCallback(() => {
    closeGenerationRef.current += 1;
    setPhase("open");
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
  }, [setPhase]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      void close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, close]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !origin || !dialog || dialog.open) return;

    setPhase("opening");
    releaseScrollRef.current ??= lockDocumentScroll();
    dialog.show();
    const animationFrame = requestAnimationFrame(() => {
      const animations = startAnimations(dialog, surfaceRef.current, origin);
      animationsRef.current = animations;
      void waitForAnimations(animations).then(() => {
        if (phaseRef.current === "opening") setPhase("open");
      });
    });
    return () => {
      cancelAnimationFrame(animationFrame);
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      dialog.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    };
  }, [active, dialogRef, origin, setPhase, surfaceRef]);

  useEffect(() => {
    if (!active) return;
    const animationFrame = requestAnimationFrame(() => initialFocusRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(animationFrame);
  }, [active, initialFocusRef]);

  const handleDialogClose = useCallback(() => {
    releaseScrollRef.current?.();
    releaseScrollRef.current = null;
  }, []);

  useEffect(() => () => handleDialogClose(), [handleDialogClose]);

  return { phase, close, keepOpen, handleDialogClose };
}
