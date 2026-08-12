import { useCallback, useEffect, useRef } from "react";

const OVERLAY_HISTORY_KEY = "awmpcBibleOverlay";

function isOverlayHistoryEntry(state: unknown): boolean {
  return typeof state === "object"
    && state !== null
    && (state as Record<string, unknown>)[OVERLAY_HISTORY_KEY] === true;
}

type OverlayHistoryHandle = Readonly<{ dismiss: () => void }>;

export function useOverlayHistory(active: boolean, requestClose: () => void): OverlayHistoryHandle {
  const wantsEntryRef = useRef(active);
  const ownsEntryRef = useRef(false);
  const suppressPopstateRef = useRef(false);
  const requestCloseRef = useRef(requestClose);

  const handlePopstate = useCallback(function handleOverlayPopstate() {
    if (suppressPopstateRef.current) {
      suppressPopstateRef.current = false;
      if (wantsEntryRef.current) {
        window.history.pushState({ [OVERLAY_HISTORY_KEY]: true }, "", window.location.href);
        ownsEntryRef.current = true;
      } else {
        window.removeEventListener("popstate", handleOverlayPopstate);
      }
      return;
    }
    if (!ownsEntryRef.current) return;
    ownsEntryRef.current = false;
    window.removeEventListener("popstate", handleOverlayPopstate);
    requestCloseRef.current();
  }, []);

  const dismiss = useCallback(() => {
    wantsEntryRef.current = false;
    if (!ownsEntryRef.current) return;
    ownsEntryRef.current = false;
    if (isOverlayHistoryEntry(window.history.state)) {
      suppressPopstateRef.current = true;
      window.history.back();
      return;
    }
    window.removeEventListener("popstate", handlePopstate);
  }, [handlePopstate]);

  useEffect(() => {
    requestCloseRef.current = requestClose;
  }, [requestClose]);

  useEffect(() => {
    wantsEntryRef.current = active;
    if (active) {
      if (!ownsEntryRef.current && !suppressPopstateRef.current) {
        window.history.pushState({ [OVERLAY_HISTORY_KEY]: true }, "", window.location.href);
        ownsEntryRef.current = true;
        window.addEventListener("popstate", handlePopstate);
      }
      return;
    }
    dismiss();
  }, [active, dismiss, handlePopstate]);

  useEffect(() => () => {
    wantsEntryRef.current = false;
    window.removeEventListener("popstate", handlePopstate);
    if (ownsEntryRef.current && isOverlayHistoryEntry(window.history.state)) {
      window.history.back();
    }
    ownsEntryRef.current = false;
    suppressPopstateRef.current = false;
  }, [handlePopstate]);

  return { dismiss };
}
