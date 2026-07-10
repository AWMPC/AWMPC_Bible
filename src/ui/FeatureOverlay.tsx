import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ReactNode } from "react";
import { featureTitle, type FeatureId, type OverlayOrigin } from "./features";
import { lockDocumentScroll } from "./scrollLock";

export type FeatureOverlayHandle = { close: () => Promise<void> };

type FeatureOverlayProps = {
  activeFeature: FeatureId | null;
  origin: OverlayOrigin | null;
  children: ReactNode;
  onClose: () => void;
};

const MOTION_EASING = "cubic-bezier(.42, 0, .58, 1)";
const OVERLAY_DURATION_MS = 400;

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

async function animate(dialog: HTMLDialogElement, origin: OverlayOrigin, reverse = false): Promise<void> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const frames = overlayFrames(dialog, origin);
  const surfaceFrames = contentFrames();
  const timing: KeyframeAnimationOptions = {
    duration: OVERLAY_DURATION_MS,
    easing: MOTION_EASING,
  };
  const animations = [
    dialog.animate(reverse ? [...frames].reverse() : frames, timing),
    dialog.querySelector<HTMLElement>(".overlay-surface")?.animate(reverse ? [...surfaceFrames].reverse() : surfaceFrames, timing),
  ].filter((value): value is Animation => Boolean(value));
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}

export const FeatureOverlay = forwardRef<FeatureOverlayHandle, FeatureOverlayProps>(
  function FeatureOverlay({ activeFeature, origin, children, onClose }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const originRef = useRef<OverlayOrigin | null>(origin);
    const closingRef = useRef(false);

    useEffect(() => { originRef.current = origin; }, [origin]);

    const close = useCallback(async () => {
      const dialog = dialogRef.current;
      const currentOrigin = originRef.current;
      if (!dialog?.open || !currentOrigin || closingRef.current) return;
      closingRef.current = true;
      await animate(dialog, currentOrigin, true);
      dialog.close();
      closingRef.current = false;
    }, []);

    useImperativeHandle(ref, () => ({ close }), [close]);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      let animationFrame = 0;
      let releaseScroll = () => {};
      if (activeFeature && origin && !dialog.open) {
        releaseScroll = lockDocumentScroll();
        dialog.style.height = `${origin.availableHeight}px`;
        dialog.showModal();
        animationFrame = requestAnimationFrame(() => void animate(dialog, origin));
      }
      return () => {
        cancelAnimationFrame(animationFrame);
        dialog.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
        releaseScroll();
      };
    }, [activeFeature, origin]);

    return (
      <dialog
        ref={dialogRef}
        className="feature-overlay"
        aria-labelledby="feature-overlay-title"
        onCancel={(event) => { event.preventDefault(); void close(); }}
        onClose={onClose}
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
