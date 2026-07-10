export const VERSE_FONTS = Object.freeze([
  { id: "system-serif", label: "System serif" },
  { id: "system-sans", label: "System sans" },
  { id: "rounded", label: "Rounded" },
  { id: "monospace", label: "Monospace" },
] as const);

export type VerseFont = (typeof VERSE_FONTS)[number]["id"];
export const DEFAULT_VERSE_FONT: VerseFont = "system-serif";

export function isVerseFont(value: unknown): value is VerseFont {
  return VERSE_FONTS.some((font) => font.id === value);
}
