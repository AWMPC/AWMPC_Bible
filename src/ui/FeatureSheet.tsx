import { useEffect, useRef, type ReactNode } from "react";
import { featureTitle, type FeatureId } from "./features";

type FeatureSheetProps = {
  activeFeature: FeatureId | null;
  children: ReactNode;
  onClose: () => void;
};

export function FeatureSheet({ activeFeature, children, onClose }: FeatureSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeFeature && !dialog.open) dialog.showModal();
    if (!activeFeature && dialog.open) dialog.close();
  }, [activeFeature]);

  return (
    <dialog
      ref={dialogRef}
      className="feature-sheet"
      aria-labelledby="feature-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="sheet-surface">
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Reader tool</p>
            <h2 id="feature-sheet-title">{activeFeature ? featureTitle(activeFeature) : "Reader"}</h2>
          </div>
          <button className="sheet-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close overlay">Close</button>
        </header>
        <div className="sheet-content">{children}</div>
      </div>
    </dialog>
  );
}
