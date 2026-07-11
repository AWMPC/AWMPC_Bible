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
        {footnotes.length > 0 && <button className="footnotes-toggle" type="button" title="Footnotes" aria-label={`${expanded ? "Hide" : "Show"} footnotes for verse ${verse.number}`} aria-expanded={expanded} aria-controls={cardId} onClick={() => setExpanded((value) => !value)}><span className="footnotes-symbol" aria-hidden="true" /></button>}
      </div>
      <div className="verse-content" data-footnotes-expanded={expanded || undefined}>
        <p>{segments.map((segment, index) => typeof segment === "string"
          ? <span key={index}>{segment}</span>
          : <span className="footnote-marker-reveal" aria-hidden={!expanded} key={index}><sup className="footnote-marker" aria-label={`Footnote ${segment.footnote}`}>{segment.footnote}</sup></span>)}</p>
        {footnotes.length > 0 &&
        <div className="footnotes-reveal" aria-hidden={!expanded} inert={!expanded}>
          <div className="footnotes-reveal-inner">
            <aside className="footnotes-card" id={cardId} aria-label={`Footnotes for verse ${verse.number}`}>
              <ol>{footnotes.map((footnote) => <li key={footnote.number}><span aria-hidden="true">{footnote.number}</span><p>{footnote.text}</p></li>)}</ol>
            </aside>
          </div>
        </div>
        }
      </div>
    </>
  );
}
