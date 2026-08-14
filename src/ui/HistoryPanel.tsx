import type { HistoryEntry } from "../history/HistoryStore";
import type { BibleLanguageOption } from "../data/languages";
import { EmptyFeature } from "./EmptyFeature";
import { OverflowMarquee } from "./OverflowMarquee";
import { useHistoryVersePreviews } from "../history/useHistoryVersePreviews";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  bibleLanguageOptions: ReadonlyArray<BibleLanguageOption>;
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function HistoryPanel({ entries, bibleLanguageOptions, onSelect, onRemove, onClear }: HistoryPanelProps) {
  const previews = useHistoryVersePreviews(entries);
  if (!entries.length) return <EmptyFeature title="No reading history yet" detail="Verses selected through Navigate will appear here and sync when you sign in." />;
  return (
    <section className="history-panel" aria-label="Reading history">
      <div className="history-actions"><p>{entries.length} saved {entries.length === 1 ? "verse" : "verses"}</p><button type="button" onClick={() => { if (window.confirm("Clear all reading history? This also clears synced history.")) onClear(); }}>Clear all</button></div>
      <ol className="history-list">{entries.map((entry) => {
        const preview = previews.get(entry.id);
        return <li key={entry.id}>
          <button className="history-entry" type="button" onClick={() => onSelect(entry)}>
            <OverflowMarquee className="history-reference"><strong lang={entry.bibleLanguage}>{entry.book}</strong> {entry.chapter}:{entry.verse} <small className="history-language">{bibleLanguageOptions.find(({ id }) => id === entry.bibleLanguage)?.label ?? entry.bibleLanguage}</small></OverflowMarquee>
            {preview?.status === "loading" ? <span className="history-preview-skeleton" aria-hidden="true" /> : null}
            {preview?.status === "ready" ? <span className="history-preview" lang={entry.bibleLanguage}>{preview.text}</span> : null}
            {entry.id.startsWith("legacy-") && entry.visitedAt === "1970-01-01T00:00:00.000Z" ? <span className="history-imported">Imported</span> : <time dateTime={entry.visitedAt}>{new Date(entry.visitedAt).toLocaleString()}</time>}
          </button>
          <button className="history-remove item-clear-button" type="button" aria-label={`Remove ${entry.book} ${entry.chapter}:${entry.verse} (${entry.bibleLanguage}) from history`} onClick={() => onRemove(entry.id)}>Clear</button>
        </li>;
      })}</ol>
    </section>
  );
}
