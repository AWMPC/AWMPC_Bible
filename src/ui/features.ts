export type FeatureId = "history" | "search" | "navigation" | "profile";

export type DockFeature = Readonly<{
  id: FeatureId;
  label: string;
  shortLabel: string;
}>;

export const DOCK_FEATURES: readonly DockFeature[] = Object.freeze([
  { id: "history", label: "Reading history", shortLabel: "History" },
  { id: "search", label: "Search", shortLabel: "Search" },
  { id: "navigation", label: "Navigate books and chapters", shortLabel: "Navigate" },
  { id: "profile", label: "Profile and preferences", shortLabel: "Profile" },
]);

export function featureTitle(id: FeatureId): string {
  return DOCK_FEATURES.find((feature) => feature.id === id)?.shortLabel ?? "Reader";
}
