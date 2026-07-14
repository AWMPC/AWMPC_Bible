import type { HistoryEntry } from "../history/HistoryStore";
import { BIBLE_LANGUAGE_OPTIONS } from "../settings/bibleLanguage";
import { EmptyFeature } from "./EmptyFeature";
import { OverflowMarquee } from "./OverflowMarquee";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function HistoryPanel({ entries, onSelect, onRemove, onClear }: HistoryPanelProps) {
  if (!entries.length) return <EmptyFeature title="No reading history yet" detail="Verses selected through Navigate will appear here and sync when you sign in." />;
  return (
    <section className="history-panel" aria-label="Reading history">
      <div className="history-actions"><p>{entries.length} saved {entries.length === 1 ? "verse" : "verses"}</p><button type="button" onClick={() => { if (window.confirm("Clear all reading history? This also clears synced history.")) onClear(); }}>Clear all</button></div>
      <ol className="history-list">{entries.map((entry) => (
      <li key={entry.id}>
        <button className="history-entry" type="button" onClick={() => onSelect(entry)}>
          <OverflowMarquee className="history-reference"><strong lang={entry.bibleLanguage}>{entry.book}</strong> {entry.chapter}:{entry.verse} <small className="history-language">{BIBLE_LANGUAGE_OPTIONS.find(({ id }) => id === entry.bibleLanguage)?.label ?? entry.bibleLanguage}</small></OverflowMarquee>
          <time dateTime={entry.visitedAt}>{new Date(entry.visitedAt).toLocaleString()}</time>
        </button>
        <button className="history-remove" type="button" aria-label={`Remove ${entry.book} ${entry.chapter}:${entry.verse} (${entry.bibleLanguage}) from history`} onClick={() => onRemove(entry.id)}>Remove</button>
      </li>
      ))}</ol>
    </section>
  );
}
