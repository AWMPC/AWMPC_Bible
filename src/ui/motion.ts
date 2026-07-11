export const MOTION_DURATION_MS = 210;
export const READER_FADE_DURATION_MS = 180;

const FALLBACK_EASING = "cubic-bezier(.42, 0, .58, 1)";

export function motionEasing(): string {
  if (typeof getComputedStyle === "undefined") return FALLBACK_EASING;
  return getComputedStyle(document.documentElement).getPropertyValue("--motion-easing").trim() || FALLBACK_EASING;
}
