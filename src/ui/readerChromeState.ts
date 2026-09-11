export type ReaderChromeVisibility = "visible" | "hidden";

export type ReaderChromeScrollIntent = Readonly<{
  direction: -1 | 1;
  recordedAt: number;
}>;

const INTENT_TIMEOUT_MS = 700;
const SCROLL_DEAD_ZONE_PX = 5;
const DOCUMENT_TOP_PX = 8;

export function nextReaderChromeVisibility(
  visibility: ReaderChromeVisibility,
  previousY: number,
  currentY: number,
  intent: ReaderChromeScrollIntent | null,
  now: number,
  tapLocked = false,
): ReaderChromeVisibility {
  if (tapLocked) return visibility;
  if (!intent || now - intent.recordedAt > INTENT_TIMEOUT_MS) return visibility;

  const delta = currentY - previousY;
  if (Math.abs(delta) < SCROLL_DEAD_ZONE_PX || Math.sign(delta) !== intent.direction) return visibility;
  if (currentY <= DOCUMENT_TOP_PX) return "visible";
  return delta < 0 ? "visible" : "hidden";
}

export function toggleReaderChromeVisibility(visibility: ReaderChromeVisibility): ReaderChromeVisibility {
  return visibility === "visible" ? "hidden" : "visible";
}
