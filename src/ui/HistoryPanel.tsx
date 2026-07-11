import type { HistoryEntry } from "../history/HistoryStore";
import { EmptyFeature } from "./EmptyFeature";

export function HistoryPanel({ entries, onSelect }: { entries: HistoryEntry[]; onSelect: (entry: HistoryEntry) => void }) {
  if (!entries.length) return <EmptyFeature title="No reading history yet" detail="Verses selected through Navigate will appear here on this device." />;
  return (
    <ol className="history-list">{entries.map((entry) => (
      <li key={entry.id}>
        <button type="button" onClick={() => onSelect(entry)}>
          <span><strong>{entry.book}</strong> {entry.chapter}:{entry.verse}</span>
          <time dateTime={entry.visitedAt}>{new Date(entry.visitedAt).toLocaleString()}</time>
        </button>
      </li>
    ))}</ol>
  );
}
