export const APPEARANCES = Object.freeze([
  { id: "auto", label: "Auto" },
  { id: "day", label: "Day" },
  { id: "night", label: "Night" },
] as const);

export type Appearance = (typeof APPEARANCES)[number]["id"];
export const DEFAULT_APPEARANCE: Appearance = "auto";

export function isAppearance(value: unknown): value is Appearance {
  return APPEARANCES.some((appearance) => appearance.id === value);
}
