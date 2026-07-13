export type VerseRect = Readonly<{ number: string; top: number; bottom: number }>;

export function middleVerseFromRects(verses: readonly VerseRect[], centerY: number): string | null {
  if (!Number.isFinite(centerY) || verses.length === 0) return null;
  const containing = verses.find(({ top, bottom }) => top <= centerY && bottom >= centerY);
  if (containing) return containing.number;
  return verses.reduce((closest, candidate) => {
    const distance = Math.min(Math.abs(centerY - candidate.top), Math.abs(centerY - candidate.bottom));
    const closestDistance = Math.min(Math.abs(centerY - closest.top), Math.abs(centerY - closest.bottom));
    return distance < closestDistance ? candidate : closest;
  }).number;
}

export function middleVerseNumber(chapter: HTMLElement | null): string | null {
  if (!chapter) return null;
  const viewport = window.visualViewport;
  const centerY = viewport ? viewport.offsetTop + viewport.height / 2 : window.innerHeight / 2;
  const verses = Array.from(chapter.querySelectorAll<HTMLElement>("[data-verse-number]"), (element) => {
    const bounds = element.getBoundingClientRect();
    return { number: element.dataset.verseNumber ?? "", top: bounds.top, bottom: bounds.bottom };
  }).filter(({ number }) => number.length > 0);
  return middleVerseFromRects(verses, centerY);
}

export function nearestNumericValue(values: readonly string[], requested: string): string | null {
  if (values.length === 0) return null;
  const target = Number(requested);
  if (!Number.isFinite(target)) return values[0];
  return values.reduce((closest, candidate) => Math.abs(Number(candidate) - target) < Math.abs(Number(closest) - target) ? candidate : closest);
}
