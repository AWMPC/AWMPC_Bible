import { BIBLE_LANGUAGE_OPTIONS } from "../settings/bibleLanguage";
import type { BibleSearchStatus, LocalizedSearchResult } from "../search/useBibleSearch";
import type { RefObject } from "react";
import { EmptyFeature } from "./EmptyFeature";
import { Skeleton } from "./Skeleton";
import { OverflowMarquee } from "./OverflowMarquee";

type SearchPanelProps = {
  query: string;
  status: BibleSearchStatus;
  results: LocalizedSearchResult[];
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onSelect: (result: LocalizedSearchResult) => void;
  history: string[];
  historyLoading: boolean;
  onRecord: (query: string) => void;
  onRemoveHistory: (query: string) => void;
  onClearHistory: () => void;
};

function RecentSearches({ entries, onChoose, onRemove, onClear }: { entries: string[]; onChoose: (query: string) => void; onRemove: (query: string) => void; onClear: () => void }) {
  return (
    <section className="search-history" aria-label="Search history">
      <div><p>Recent searches</p><button type="button" onClick={() => { if (window.confirm("Clear all search history? This also clears synced search history.")) onClear(); }}>Clear All</button></div>
      <ul>{entries.map((entry) => (
        <li key={entry}>
          <button type="button" onClick={() => onChoose(entry)}><OverflowMarquee>{entry}</OverflowMarquee></button>
          <button className="item-clear-button" type="button" aria-label={`Remove ${entry} from search history`} onClick={() => onRemove(entry)}>Clear</button>
        </li>
      ))}</ul>
    </section>
  );
}

function SearchMatches({ results, query, onRecord, onSelect }: Pick<SearchPanelProps, "results" | "onRecord" | "onSelect"> & { query: string }) {
  return <ol className="search-results">{results.map((result) => {
    const language = BIBLE_LANGUAGE_OPTIONS.find(({ id }) => id === result.bibleLanguage)?.label ?? result.bibleLanguage;
    return <li key={`${result.bibleLanguage}:${result.book}:${result.chapter}:${result.verse}`}><button type="button" onClick={() => { onRecord(query); onSelect(result); }}><OverflowMarquee className="search-result-reference"><strong lang={result.bibleLanguage}>{result.book}</strong> {result.chapter}:{result.verse}{" "}<small>{language}</small></OverflowMarquee><span className="search-result-text" lang={result.bibleLanguage}>{result.text}</span></button></li>;
  })}</ol>;
}

export function SearchPanel({ query, status, results, inputRef, onQueryChange, onSelect, history, historyLoading, onRecord, onRemoveHistory, onClearHistory }: SearchPanelProps) {
  const shortQuery = Array.from(query.trim()).length < 2;
  let content;
  if (shortQuery && historyLoading) content = <Skeleton rows={3} text />;
  else if (shortQuery && history.length) content = <RecentSearches entries={history} onChoose={onQueryChange} onRemove={onRemoveHistory} onClear={onClearHistory} />;
  else if (shortQuery) content = <EmptyFeature title="Search the active text" detail="Enter at least two characters. Close matches and minor spelling differences are included." />;
  else if (status === "loading") content = <Skeleton rows={5} text />;
  else if (status === "error") content = <EmptyFeature title="Search is unavailable" detail="The local text index could not be searched. Try again." />;
  else if (status === "ready" && results.length === 0) content = <EmptyFeature title="No matching verses" detail="Try fewer words or a slightly different spelling." />;
  else content = <SearchMatches results={results} query={query} onRecord={onRecord} onSelect={onSelect} />;
  return (
    <section className="search-panel" aria-labelledby="search-panel-title" aria-busy={status === "loading" || undefined}>
      <h3 className="visually-hidden" id="search-panel-title">Search Bible text</h3>
      <form role="search" onSubmit={(event) => { event.preventDefault(); if (!shortQuery) onRecord(query); }}>
        <label htmlFor="bible-search">Search active Bible text</label>
        <input ref={inputRef} id="bible-search" type="search" inputMode="search" maxLength={120} autoComplete="off" spellCheck="false" value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} placeholder="Words or phrase" />
      </form>
      <p className="search-status" role="status" aria-live="polite">{status === "loading" ? "Searching…" : status === "ready" ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}</p>
      {content}
    </section>
  );
}
