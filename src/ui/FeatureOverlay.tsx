import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ReactNode } from "react";
import { featureTitle, type FeatureId, type OverlayOrigin } from "./features";
import { lockDocumentScroll } from "./scrollLock";

export type FeatureOverlayHandle = { close: () => Promise<void>; keepOpen: () => void };

type FeatureOverlayProps = {
  activeFeature: FeatureId | null;
  origin: OverlayOrigin | null;
  children: ReactNode;
  onClose: () => void;
};

const FALLBACK_MOTION_EASING = "cubic-bezier(.42, 0, .58, 1)";
const OVERLAY_DURATION_MS = 210;

function motionEasing(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--motion-easing").trim() || FALLBACK_MOTION_EASING;
}

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
    { opacity: 1, transform: "translate(0, 0) scale(1)", borderRadius: "0 0 30px 30px" },
  ];
}

function contentFrames(): Keyframe[] {
  return [
    { opacity: 0, transform: "scale(.94)" },
    { opacity: 1, transform: "scale(1)" },
  ];
}

function startAnimations(dialog: HTMLDialogElement, origin: OverlayOrigin): Animation[] {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return [];
  const frames = overlayFrames(dialog, origin);
  const surfaceFrames = contentFrames();
  const timing: KeyframeAnimationOptions = {
    duration: OVERLAY_DURATION_MS,
    easing: motionEasing(),
  };
  return [
    dialog.animate(frames, timing),
    dialog.querySelector<HTMLElement>(".overlay-surface")?.animate(surfaceFrames, timing),
  ].filter((value): value is Animation => Boolean(value));
}

async function waitForAnimations(animations: Animation[]): Promise<void> {
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}

export const FeatureOverlay = forwardRef<FeatureOverlayHandle, FeatureOverlayProps>(
  function FeatureOverlay({ activeFeature, origin, children, onClose }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const originRef = useRef<OverlayOrigin | null>(origin);
    const closingRef = useRef(false);
    const animationsRef = useRef<Animation[]>([]);
    const releaseScrollRef = useRef<(() => void) | null>(null);
    const closeGenerationRef = useRef(0);

    useEffect(() => { originRef.current = origin; }, [origin]);

    const close = useCallback(async () => {
      const dialog = dialogRef.current;
      const currentOrigin = originRef.current;
      if (!dialog?.open || !currentOrigin || closingRef.current) return;
      closingRef.current = true;
      const closeGeneration = ++closeGenerationRef.current;
      let animations = animationsRef.current.filter((animation) => animation.playState !== "idle");
      if (animations.length) animations.forEach((animation) => animation.reverse());
      else {
        animations = startAnimations(dialog, currentOrigin);
        animations.forEach((animation) => {
          animation.currentTime = animation.effect?.getTiming().duration as number;
          animation.reverse();
        });
      }
      animationsRef.current = animations;
      await waitForAnimations(animations);
      if (closeGeneration !== closeGenerationRef.current) return;
      dialog.close();
      animationsRef.current = [];
      closingRef.current = false;
    }, []);

    const keepOpen = useCallback(() => {
      closeGenerationRef.current += 1;
      closingRef.current = false;
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
    }, []);

    useImperativeHandle(ref, () => ({ close, keepOpen }), [close, keepOpen]);

    useEffect(() => {
      if (!activeFeature) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        void close();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [activeFeature, close]);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      let animationFrame = 0;
      if (activeFeature && origin && !dialog.open) {
        releaseScrollRef.current ??= lockDocumentScroll();
        dialog.style.height = `${origin.availableHeight}px`;
        dialog.show();
        animationFrame = requestAnimationFrame(() => {
          animationsRef.current = startAnimations(dialog, origin);
        });
      }
      return () => {
        cancelAnimationFrame(animationFrame);
        animationsRef.current.forEach((animation) => animation.cancel());
        animationsRef.current = [];
        dialog.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      };
    }, [activeFeature, origin]);

    useEffect(() => {
      if (!activeFeature || !dialogRef.current?.open) return;
      const content = dialogRef.current.querySelector<HTMLElement>(".overlay-content");
      if (content) content.scrollTop = 0;
    }, [activeFeature]);

    useEffect(() => () => {
      releaseScrollRef.current?.();
      releaseScrollRef.current = null;
    }, []);

    return (
      <dialog
        ref={dialogRef}
        id="feature-overlay"
        className="feature-overlay"
        aria-labelledby="feature-overlay-title"
        onCancel={(event) => { event.preventDefault(); void close(); }}
        onClose={() => {
          releaseScrollRef.current?.();
          releaseScrollRef.current = null;
          onClose();
        }}
        onClick={(event) => { if (event.target === event.currentTarget) void close(); }}
      >
        <div className="overlay-surface">
          <header className="overlay-header">
            <div>
              <p className="eyebrow">AWMPC Bible</p>
              <h2 id="feature-overlay-title">{activeFeature ? featureTitle(activeFeature) : "AWMPC Bible"}</h2>
            </div>
            <button className="overlay-close" type="button" onClick={() => void close()} aria-label="Close overlay">Close</button>
          </header>
          <div className="overlay-content">{children}</div>
        </div>
      </dialog>
    );
  },
);
