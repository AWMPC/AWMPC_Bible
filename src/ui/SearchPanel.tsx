import { BIBLE_LANGUAGE_OPTIONS } from "../settings/bibleLanguage";
import type { BibleSearchStatus, LocalizedSearchResult } from "../search/useBibleSearch";
import type { RefObject } from "react";
import { EmptyFeature } from "./EmptyFeature";
import { Skeleton } from "./Skeleton";

type SearchPanelProps = {
  query: string;
  status: BibleSearchStatus;
  results: LocalizedSearchResult[];
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onSelect: (result: LocalizedSearchResult) => void;
};

export function SearchPanel({ query, status, results, inputRef, onQueryChange, onSelect }: SearchPanelProps) {
  const shortQuery = Array.from(query.trim()).length < 2;
  return (
    <section className="search-panel" aria-labelledby="search-panel-title" aria-busy={status === "loading" || undefined}>
      <h3 className="visually-hidden" id="search-panel-title">Search Bible text</h3>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="bible-search">Search active Bible text</label>
        <input ref={inputRef} id="bible-search" type="search" inputMode="search" maxLength={120} autoComplete="off" spellCheck="false" value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} placeholder="Words or phrase" />
      </form>
      <p className="search-status" role="status" aria-live="polite">{status === "loading" ? "Searching…" : status === "ready" ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}</p>
      {shortQuery ? <EmptyFeature title="Search the active text" detail="Enter at least two characters. Close matches and minor spelling differences are included." />
        : status === "loading" ? <Skeleton rows={5} text />
          : status === "error" ? <EmptyFeature title="Search is unavailable" detail="The local text index could not be searched. Try again." />
            : status === "ready" && results.length === 0 ? <EmptyFeature title="No matching verses" detail="Try fewer words or a slightly different spelling." />
              : <ol className="search-results">{results.map((result) => {
                const language = BIBLE_LANGUAGE_OPTIONS.find(({ id }) => id === result.bibleLanguage)?.label ?? result.bibleLanguage;
                return <li key={`${result.bibleLanguage}:${result.book}:${result.chapter}:${result.verse}`}><button type="button" onClick={() => onSelect(result)}><span><strong lang={result.bibleLanguage}>{result.book}</strong> {result.chapter}:{result.verse}<small>{language}</small></span><p lang={result.bibleLanguage}>{result.text}</p></button></li>;
              })}</ol>}
    </section>
  );
}
