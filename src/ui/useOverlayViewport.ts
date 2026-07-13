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

    const updateHeight = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const dockTop = dockRef.current?.getBoundingClientRect().y;
      const height = dockTop === undefined
        ? fallbackHeight
        : Math.max(0, Math.floor(dockTop - OVERLAY_DOCK_GAP_PX));
      if (height !== undefined) dialog.style.height = `${height}px`;
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, [active, dialogRef, dockRef, fallbackHeight]);
}
