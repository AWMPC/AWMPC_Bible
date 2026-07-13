import { useId, useState } from "react";
import type { Verse } from "../data/contracts";
import type { BibleLanguage } from "../settings/bibleLanguage";

export function VerseWithFootnotes({ verse, language, actionLanguageLabel, actionsOpen, onActions }: { verse: Verse; language: BibleLanguage; actionLanguageLabel?: string; actionsOpen: boolean; onActions: (verse: Verse, trigger: HTMLButtonElement) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cardId = useId();
  const footnotes = verse.footnotes ?? [];
  const segments = verse.segments ?? [verse.text];

  return (
    <div className="verse-language-row" lang={language}>
      <div className="verse-rail">
        <button className="verse-number" type="button" aria-label={`Actions for ${actionLanguageLabel ? `${actionLanguageLabel} ` : ""}verse ${verse.number}`} aria-haspopup="menu" aria-expanded={actionsOpen} aria-controls={actionsOpen ? "verse-actions-menu" : undefined} onClick={(event) => onActions(verse, event.currentTarget)}>{verse.number}</button>
      </div>
      <div className="verse-content" data-footnotes-expanded={expanded || undefined}>
        <p>{segments.map((segment, index) => typeof segment === "string"
          ? <span key={index}>{segment}</span>
          : <span className="footnote-marker-reveal" aria-hidden={!expanded} key={index}><sup className="footnote-marker" aria-label={`Footnote ${segment.footnote}`}>{segment.footnote}</sup></span>)}{footnotes.length > 0 && <button className="footnotes-toggle" type="button" title="Footnotes" aria-label={`${expanded ? "Hide" : "Show"} footnotes for verse ${verse.number}`} aria-expanded={expanded} aria-controls={cardId} onClick={() => setExpanded((value) => !value)}><svg className="footnotes-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.5" /><path d="M12 10.5v6" /><circle cx="12" cy="7.5" r=".8" stroke="none" fill="currentColor" /></svg></button>}</p>
      </div>
      {footnotes.length > 0 &&
        <div className="footnotes-reveal" data-footnotes-expanded={expanded || undefined} aria-hidden={!expanded} inert={!expanded}>
          <div className="footnotes-reveal-inner">
            <aside className="footnotes-card" id={cardId} aria-label={`Footnotes for verse ${verse.number}`}>
              <ol>{footnotes.map((footnote) => <li key={footnote.number}><span aria-hidden="true">{footnote.number}</span><p>{footnote.text}</p></li>)}</ol>
            </aside>
          </div>
        </div>
      }
    </div>
  );
}
