export const TEXT_SCALES = Object.freeze([
  { id: "compact", label: "Compact", marker: "80%", detail: "More verses on screen" },
  { id: "standard", label: "Standard", marker: "90%", detail: "Balanced for everyday reading" },
  { id: "comfortable", label: "Comfortable", marker: "100%", detail: "A little more room to breathe" },
  { id: "large", label: "Large", marker: "110%", detail: "Clear text at greater distance" },
  { id: "extra-large", label: "Extra large", marker: "120%", detail: "Maximum reading presence" },
] as const);

export type TextScale = (typeof TEXT_SCALES)[number]["id"];

export const DEFAULT_TEXT_SCALE: TextScale = "standard";

export function isTextScale(value: unknown): value is TextScale {
  return TEXT_SCALES.some((scale) => scale.id === value);
}

export function textScaleAt(index: number): TextScale {
  return TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, Math.round(index)))].id;
}

export function textScaleIndex(scale: TextScale): number {
  return TEXT_SCALES.findIndex((option) => option.id === scale);
}
