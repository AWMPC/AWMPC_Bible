import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { featureTitle, type FeatureId, type OverlayOrigin } from "./features";
import { useOverlayLifecycle } from "./useOverlayLifecycle";
import { useOverlayViewport } from "./useOverlayViewport";

export type FeatureOverlayHandle = { close: () => Promise<void>; keepOpen: () => void };

type FeatureOverlayProps = {
  activeFeature: FeatureId | null;
  origin: OverlayOrigin | null;
  dockRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  onCloseStart: () => void;
  onClose: () => void;
};

export const FeatureOverlay = forwardRef<FeatureOverlayHandle, FeatureOverlayProps>(
  function FeatureOverlay({ activeFeature, origin, dockRef, contentRef, initialFocusRef, children, onCloseStart, onClose }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const focusTargetRef = initialFocusRef ?? closeButtonRef;
    const active = activeFeature !== null;

    useOverlayViewport({
      active,
      fallbackHeight: origin?.availableHeight,
      dialogRef,
      dockRef,
    });
    const { phase, close, keepOpen, handleDialogClose } = useOverlayLifecycle({
      active,
      origin,
      onCloseStart,
      dialogRef,
      surfaceRef,
      initialFocusRef: focusTargetRef,
    });

    useImperativeHandle(ref, () => ({ close, keepOpen }), [close, keepOpen]);

    useEffect(() => {
      if (activeFeature && contentRef.current) contentRef.current.scrollTop = 0;
    }, [activeFeature, contentRef]);

    return (
      <>
        <button
          className={`overlay-shade${phase === "opening" || phase === "open" ? " is-visible" : ""}`}
          type="button"
          aria-label="Close overlay"
          disabled={phase !== "opening" && phase !== "open"}
          onClick={() => void close()}
        />
        <dialog
          ref={dialogRef}
          id="feature-overlay"
          className="feature-overlay"
          data-feature={activeFeature ?? undefined}
          aria-labelledby="feature-overlay-title"
          onCancel={(event) => { event.preventDefault(); void close(); }}
          onClose={() => { handleDialogClose(); onClose(); }}
          onClick={(event) => { if (event.target === event.currentTarget) void close(); }}
        >
          <div ref={surfaceRef} className="overlay-surface">
            <header className="overlay-header">
              <div>
                <p className="eyebrow overlay-brand"><span>AWMPC Bible</span><span className="overlay-version" aria-label={`Version ${__APP_VERSION__}`}>{__APP_VERSION__}</span></p>
                <h2 id="feature-overlay-title">{activeFeature ? featureTitle(activeFeature) : "AWMPC Bible"}</h2>
              </div>
              <button ref={closeButtonRef} className="overlay-close" type="button" onClick={() => void close()} aria-label="Close overlay">Close</button>
            </header>
            <div ref={contentRef} className="overlay-content">{children}</div>
          </div>
        </dialog>
      </>
    );
  },
);
