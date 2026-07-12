import { createOverlayOrigin, DOCK_FEATURES, type FeatureId, type OverlayOrigin } from "./features";

type FloatingDockProps = {
  activeFeature: FeatureId | null;
  visible: boolean;
  onOpen: (feature: FeatureId, origin: OverlayOrigin, trigger: HTMLButtonElement) => void;
};

export function FloatingDock({ activeFeature, visible, onOpen }: FloatingDockProps) {
  return (
    <nav className={`floating-dock${visible ? "" : " is-hidden"}`} aria-label="AWMPC Bible tools">
      <div className="dock-scroll">
        {DOCK_FEATURES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className="dock-button"
            data-feature={feature.id}
            aria-label={feature.label}
            aria-haspopup="dialog"
            aria-controls="feature-overlay"
            aria-expanded={activeFeature === feature.id}
            onClick={(event) => {
              const button = event.currentTarget.getBoundingClientRect();
              const dock = event.currentTarget.closest("nav")?.getBoundingClientRect();
              if (dock) onOpen(feature.id, createOverlayOrigin(button, dock), event.currentTarget);
            }}
          >
            <span className={`dock-symbol dock-symbol-${feature.id}`} aria-hidden="true" />
            <span>{feature.shortLabel}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
