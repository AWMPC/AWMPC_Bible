const OVERFLOW_TOLERANCE_PX = 1;
const MIN_DURATION_SECONDS = 4;
const MAX_DURATION_SECONDS = 12;
const PIXELS_PER_SECOND = 54;

export function overflowMarqueeMetrics(viewportWidth: number, contentWidth: number) {
  const measured = Number.isFinite(viewportWidth) && Number.isFinite(contentWidth)
    ? Math.max(0, Math.ceil(contentWidth - viewportWidth))
    : 0;
  const distance = measured > OVERFLOW_TOLERANCE_PX ? measured : 0;
  const duration = Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.ceil(2 + distance * 2 / PIXELS_PER_SECOND)));
  return { distance, duration, overflowing: distance > 0 } as const;
}
