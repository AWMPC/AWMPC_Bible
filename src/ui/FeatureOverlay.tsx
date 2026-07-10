import { useEffect, useRef, type ReactNode } from "react";
import { featureTitle, type FeatureId, type OverlayOrigin } from "./features";

type FeatureOverlayProps = {
  activeFeature: FeatureId | null;
  origin: OverlayOrigin | null;
  children: ReactNode;
  onClose: () => void;
};

function animateFromOrigin(dialog: HTMLDialogElement, origin: OverlayOrigin): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = dialog.getBoundingClientRect();
  const offsetX = origin.x + origin.width / 2 - (target.x + target.width / 2);
  const offsetY = origin.y + origin.height / 2 - (target.y + target.height / 2);

  dialog.animate(
    [
      {
        opacity: 0.72,
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${origin.width / target.width}, ${origin.height / target.height})`,
        borderRadius: "16px",
      },
      { opacity: 1, transform: "translate(0, 0) scale(1)", borderRadius: "0 0 30px 30px" },
    ],
    { duration: 360, easing: "cubic-bezier(.2, .8, .2, 1)" },
  );
  dialog.querySelector<HTMLElement>(".overlay-surface")?.animate(
    [{ opacity: 0 }, { opacity: 0, offset: 0.42 }, { opacity: 1 }],
    { duration: 360, easing: "ease-out" },
  );
}

export function FeatureOverlay({ activeFeature, origin, children, onClose }: FeatureOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let animationFrame = 0;

    if (activeFeature && origin && !dialog.open) {
      dialog.style.height = `${origin.availableHeight}px`;
      dialog.showModal();
      animationFrame = requestAnimationFrame(() => animateFromOrigin(dialog, origin));
    } else if (!activeFeature && dialog.open) {
      dialog.close();
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      dialog.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    };
  }, [activeFeature, origin]);

  return (
    <dialog
      ref={dialogRef}
      className="feature-overlay"
      aria-labelledby="feature-overlay-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="overlay-surface">
        <header className="overlay-header">
          <div>
            <p className="eyebrow">Reader tool</p>
            <h2 id="feature-overlay-title">{activeFeature ? featureTitle(activeFeature) : "Reader"}</h2>
          </div>
          <button className="overlay-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close overlay">Close</button>
        </header>
        <div className="overlay-content">{children}</div>
      </div>
    </dialog>
  );
}
