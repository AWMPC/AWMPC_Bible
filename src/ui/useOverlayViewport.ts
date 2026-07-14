import { useLayoutEffect, type RefObject } from "react";

const OVERLAY_DOCK_GAP_PX = 8;

type UseOverlayViewportOptions = {
  active: boolean;
  fallbackHeight?: number;
  dialogRef: RefObject<HTMLDialogElement | null>;
  dockRef: RefObject<HTMLElement | null>;
};

export function useOverlayViewport({ active, fallbackHeight, dialogRef, dockRef }: UseOverlayViewportOptions): void {
  useLayoutEffect(() => {
    if (!active) return;

    const updateGeometry = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const dockTop = dockRef.current?.getBoundingClientRect().y;
      const availableHeight = dockTop === undefined
        ? fallbackHeight
        : Math.max(0, Math.floor(dockTop - OVERLAY_DOCK_GAP_PX));
      if (availableHeight !== undefined) {
        dialog.style.setProperty("--overlay-max-height", `${availableHeight}px`);
        dialog.style.setProperty("--overlay-center-y", `${availableHeight / 2}px`);
      }
    };

    updateGeometry();
    window.addEventListener("resize", updateGeometry);
    window.visualViewport?.addEventListener("resize", updateGeometry);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.visualViewport?.removeEventListener("resize", updateGeometry);
      dialogRef.current?.style.removeProperty("--overlay-max-height");
      dialogRef.current?.style.removeProperty("--overlay-center-y");
    };
  }, [active, dialogRef, dockRef, fallbackHeight]);
}
