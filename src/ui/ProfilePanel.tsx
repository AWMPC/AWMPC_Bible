import { TEXT_SCALES, textScaleAt, textScaleIndex, type TextScale } from "../settings/textScale";
import { VERSE_FONTS, type VerseFont } from "../settings/verseFont";
import { APPEARANCES, type Appearance } from "../settings/appearance";
import { BIBLE_LANGUAGE_OPTIONS, type BibleLanguage } from "../settings/bibleLanguage";

type ProfilePanelProps = {
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  verseFont: VerseFont;
  onVerseFontChange: (font: VerseFont) => void;
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  bibleLanguage: BibleLanguage;
  onBibleLanguageChange: (language: BibleLanguage) => void;
};

export function ProfilePanel({ textScale, onTextScaleChange, verseFont, onVerseFontChange, appearance, onAppearanceChange, bibleLanguage, onBibleLanguageChange }: ProfilePanelProps) {
  const selected = TEXT_SCALES[textScaleIndex(textScale)];
  return (
    <div className="profile-panel">
      <section className="setting-group" aria-labelledby="reading-size-title">
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
      <section className="setting-group font-setting" aria-labelledby="verse-font-label">
        <div>
          <p className="eyebrow">Typography</p>
          <label id="verse-font-label" htmlFor="verse-font">Verse font</label>
          <p>Uses the closest available local font on this device.</p>
        </div>
        <select id="verse-font" className="setting-select" value={verseFont} onChange={(event) => onVerseFontChange(event.currentTarget.value as VerseFont)}>
          {VERSE_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
      </section>
      <section className="setting-group font-setting" aria-labelledby="bible-language-label">
        <div>
          <p className="eyebrow">Bible text</p>
          <label id="bible-language-label" htmlFor="bible-language">Language</label>
          <p>Selects the locally available Bible translation.</p>
        </div>
        <select id="bible-language" className="setting-select" value={bibleLanguage} onChange={(event) => onBibleLanguageChange(event.currentTarget.value as BibleLanguage)}>
          {BIBLE_LANGUAGE_OPTIONS.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
        </select>
      </section>
      <section className="setting-group font-setting" aria-labelledby="appearance-label">
        <div>
          <p className="eyebrow">Interface</p>
          <label id="appearance-label" htmlFor="appearance">Appearance</label>
          <p>Auto follows the current operating system or browser setting.</p>
        </div>
        <select id="appearance" className="setting-select" value={appearance} onChange={(event) => onAppearanceChange(event.currentTarget.value as Appearance)}>
          {APPEARANCES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </section>
    </div>
  );
}
