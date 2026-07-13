export const VERSE_FONTS = Object.freeze([
  { id: "system-sans", label: "Sans" },
  { id: "system-serif", label: "Serif" },
  { id: "monospace", label: "Mono" },
] as const);

export type VerseFont = (typeof VERSE_FONTS)[number]["id"];
export const DEFAULT_VERSE_FONT: VerseFont = "system-serif";

export function isVerseFont(value: unknown): value is VerseFont {
  return VERSE_FONTS.some((font) => font.id === value);
}

export function normalizeVerseFont(value: unknown): VerseFont {
  if (value === "rounded") return "system-sans";
  return isVerseFont(value) ? value : DEFAULT_VERSE_FONT;
}
