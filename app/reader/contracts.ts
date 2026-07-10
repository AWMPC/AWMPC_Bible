export type ThemeId = "glass" | "expressive";

export const THEMES: ReadonlyArray<{ id: ThemeId; label: string }> = [
  { id: "glass", label: "Liquid Glass" },
  { id: "expressive", label: "Material Expressive" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function numericKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort((a, b) => Number(a) - Number(b));
}

export function retryDelay(attempt: number, random = 0.5): number {
  const cappedAttempt = Math.max(0, Math.min(attempt, 5));
  return Math.round(Math.min(4000, 250 * 2 ** cappedAttempt) * (0.75 + random * 0.5));
}
