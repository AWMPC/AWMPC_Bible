import { TEXT_SCALES, textScaleAt, textScaleIndex, type TextScale } from "../settings/textScale";
import { VERSE_FONTS, type VerseFont } from "../settings/verseFont";
import { APPEARANCES, type Appearance } from "../settings/appearance";
import type { BibleLanguage, BibleLanguageOption } from "../data/languages";
import type { CloudAccountState } from "../cloud/contracts";
import { Skeleton } from "./Skeleton";
import { CloudAccountCard } from "./CloudAccountCard";

type ProfilePanelProps = {
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  verseFont: VerseFont;
  onVerseFontChange: (font: VerseFont) => void;
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  primaryBibleLanguage: BibleLanguage;
  secondaryBibleLanguage: BibleLanguage | null;
  onPrimaryBibleLanguageChange: (language: BibleLanguage) => void;
  onSecondaryBibleLanguageChange: (language: BibleLanguage | null) => void;
  bibleLanguageOptions: ReadonlyArray<BibleLanguageOption>;
  account: CloudAccountState;
  onSignIn: () => void;
  onSignOut: () => void;
};

export function ProfilePanel({ textScale, onTextScaleChange, verseFont, onVerseFontChange, appearance, onAppearanceChange, primaryBibleLanguage, secondaryBibleLanguage, onPrimaryBibleLanguageChange, onSecondaryBibleLanguageChange, bibleLanguageOptions, account, onSignIn, onSignOut }: ProfilePanelProps) {
  const selected = TEXT_SCALES[textScaleIndex(textScale)];
  return (
    <div className="profile-panel">
      <CloudAccountCard account={account} onSignIn={onSignIn} onSignOut={onSignOut} />
      {account.status === "loading" ? <div className="profile-settings-loading" aria-label="Loading reader settings"><Skeleton rows={5} /></div> : <>
      <section className="setting-group" aria-labelledby="reading-size-title">
        <div className="setting-heading">
          <div><p className="eyebrow">Reading</p><h3 id="reading-size-title">Verse text size</h3></div>
          <output htmlFor="text-scale"><strong>{selected.label}</strong><span>{selected.detail}</span></output>
        </div>
        <div className="text-scale-control">
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
          <div className="scale-marks" aria-hidden="true">
            {TEXT_SCALES.map((scale, index) => {
              const position = `${index / (TEXT_SCALES.length - 1) * 100}%`;
              return (
                <span className={`scale-mark${scale.id === textScale ? " is-selected" : ""}`} style={{ left: position }} key={scale.id}>
                  <span className="scale-tick" />
                  <span className="scale-label">{scale.marker}</span>
                </span>
              );
            })}
          </div>
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
      <section className="setting-group font-setting" aria-labelledby="primary-bible-language-label">
        <div>
          <p className="eyebrow">Bible text</p>
          <label id="primary-bible-language-label" htmlFor="primary-bible-language">Primary language</label>
          <p>The main language used for navigation and verse selection.</p>
        </div>
        <select id="primary-bible-language" className="setting-select" value={primaryBibleLanguage} onChange={(event) => onPrimaryBibleLanguageChange(event.currentTarget.value as BibleLanguage)}>
          {bibleLanguageOptions.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
        </select>
      </section>
      <section className="setting-group font-setting" aria-labelledby="secondary-bible-language-label">
        <div>
          <p className="eyebrow">Parallel text</p>
          <label id="secondary-bible-language-label" htmlFor="secondary-bible-language">Secondary language</label>
          <p>Optionally stacks another translation beneath each primary verse.</p>
        </div>
        <select id="secondary-bible-language" className="setting-select" value={secondaryBibleLanguage ?? ""} onChange={(event) => onSecondaryBibleLanguageChange(event.currentTarget.value as BibleLanguage || null)}>
          <option value="">None</option>
          {bibleLanguageOptions.filter(({ id }) => id !== primaryBibleLanguage).map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
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
      </>}
    </div>
  );
}
