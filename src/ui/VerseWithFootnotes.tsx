import { useId, useState } from "react";
import type { Verse } from "../data/contracts";

export function VerseWithFootnotes({ verse }: { verse: Verse }) {
  const [expanded, setExpanded] = useState(false);
  const cardId = useId();
  const footnotes = verse.footnotes ?? [];
  const segments = verse.segments ?? [verse.text];

  return (
    <div className="verse-content">
      <p>{segments.map((segment, index) => typeof segment === "string"
        ? <span key={index}>{segment}</span>
        : expanded && <sup className="footnote-marker" aria-label={`Footnote ${segment.footnote}`} key={index}>{segment.footnote}</sup>)}</p>
      {footnotes.length > 0 && <>
        <button className="footnotes-toggle" type="button" aria-expanded={expanded} aria-controls={cardId} onClick={() => setExpanded((value) => !value)}>footnotes</button>
        {expanded && <aside className="footnotes-card" id={cardId} aria-label={`Footnotes for verse ${verse.number}`}>
          <ol>{footnotes.map((footnote) => <li key={footnote.number}><span aria-hidden="true">{footnote.number}</span><p>{footnote.text}</p></li>)}</ol>
        </aside>}
      </>}
    </div>
  );
}
