import { TEXT_SCALES, textScaleAt, textScaleIndex, type TextScale } from "../settings/textScale";

type ProfilePanelProps = {
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
};

export function ProfilePanel({ textScale, onTextScaleChange }: ProfilePanelProps) {
  const selected = TEXT_SCALES[textScaleIndex(textScale)];
  return (
    <section className="profile-panel" aria-labelledby="reading-size-title">
      <div className="setting-heading">
        <div><p className="eyebrow">Reading</p><h3 id="reading-size-title">Verse text size</h3></div>
        <output htmlFor="text-scale"><strong>{selected.label}</strong><span>{selected.detail}</span></output>
      </div>
      <input
        id="text-scale"
        className="text-scale-slider"
        type="range"
        min="0"
        max={TEXT_SCALES.length - 1}
        step="1"
        value={textScaleIndex(textScale)}
        aria-label="Verse text size"
        aria-valuetext={selected.label}
        onChange={(event) => onTextScaleChange(textScaleAt(event.currentTarget.valueAsNumber))}
      />
      <div className="scale-labels" aria-hidden="true">
        {TEXT_SCALES.map((scale) => <span key={scale.id}>{scale.label}</span>)}
      </div>
      <p className="setting-note">Applies to every verse and verse number.</p>
    </section>
  );
}
