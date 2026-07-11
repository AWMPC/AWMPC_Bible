import type { HistoryEntry } from "../history/HistoryStore";
import { EmptyFeature } from "./EmptyFeature";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function HistoryPanel({ entries, onSelect, onRemove, onClear }: HistoryPanelProps) {
  if (!entries.length) return <EmptyFeature title="No reading history yet" detail="Verses selected through Navigate will appear here on this device." />;
  return (
    <section className="history-panel" aria-label="Reading history">
      <div className="history-actions"><p>{entries.length} saved {entries.length === 1 ? "verse" : "verses"}</p><button type="button" onClick={() => { if (window.confirm("Clear all reading history on this device?")) onClear(); }}>Clear all</button></div>
      <ol className="history-list">{entries.map((entry) => (
      <li key={entry.id}>
        <button className="history-entry" type="button" onClick={() => onSelect(entry)}>
          <span><strong>{entry.book}</strong> {entry.chapter}:{entry.verse}</span>
          <time dateTime={entry.visitedAt}>{new Date(entry.visitedAt).toLocaleString()}</time>
        </button>
        <button className="history-remove" type="button" aria-label={`Remove ${entry.book} ${entry.chapter}:${entry.verse} from history`} onClick={() => onRemove(entry.id)}>Remove</button>
      </li>
      ))}</ol>
    </section>
  );
}
