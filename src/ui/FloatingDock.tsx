import { DOCK_FEATURES, type FeatureId } from "./features";

type FloatingDockProps = {
  activeFeature: FeatureId | null;
  onOpen: (feature: FeatureId) => void;
};

export function FloatingDock({ activeFeature, onOpen }: FloatingDockProps) {
  return (
    <nav className="floating-dock" aria-label="Reader tools">
      <div className="dock-scroll">
        {DOCK_FEATURES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className="dock-button"
            aria-label={feature.label}
            aria-haspopup="dialog"
            aria-expanded={activeFeature === feature.id}
            onClick={() => onOpen(feature.id)}
          >
            <span className={`dock-symbol dock-symbol-${feature.id}`} aria-hidden="true" />
            <span>{feature.shortLabel}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
