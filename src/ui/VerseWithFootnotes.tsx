import { useId, useState } from "react";
import type { Verse } from "../data/contracts";

export function VerseWithFootnotes({ verse }: { verse: Verse }) {
  const [expanded, setExpanded] = useState(false);
  const cardId = useId();
  const footnotes = verse.footnotes ?? [];
  const segments = verse.segments ?? [verse.text];

  return (
    <>
      <div className="verse-rail">
        <span className="verse-number" aria-label={`Verse ${verse.number}`}>{verse.number}</span>
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
    </>
  );
}
