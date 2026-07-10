export type FeatureId = "history" | "search" | "navigation" | "profile";

export type OverlayOrigin = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  availableHeight: number;
}>;

type RectLike = Pick<DOMRect, "x" | "y" | "width" | "height">;

export function createOverlayOrigin(button: RectLike, dock: RectLike): OverlayOrigin {
  return {
    x: button.x,
    y: button.y,
    width: button.width,
    height: button.height,
    availableHeight: Math.max(0, Math.floor(dock.y - 8)),
  };
}

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
  return DOCK_FEATURES.find((feature) => feature.id === id)?.shortLabel ?? "AWMPC Bible";
}
