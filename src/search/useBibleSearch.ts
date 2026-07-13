import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../data/contracts";
import type { LibraryStatus } from "../data/useBibleLibrary";
import type { BibleLanguage } from "../settings/bibleLanguage";

export type LocalizedSearchResult = SearchResult & Readonly<{ bibleLanguage: BibleLanguage }>;
export type BibleSearchStatus = "idle" | "loading" | "ready" | "error";

type SearchLibrary = (query: string, limit?: number) => Promise<SearchResult[] | null>;

type BibleSearchOptions = {
  enabled: boolean;
  primaryLanguage: BibleLanguage;
  secondaryLanguage: BibleLanguage | null;
  primaryStatus: LibraryStatus;
  secondaryStatus: LibraryStatus;
  searchPrimary: SearchLibrary;
  searchSecondary: SearchLibrary;
  cancelPrimary: () => void;
  cancelSecondary: () => void;
};

export function useBibleSearch(options: BibleSearchOptions) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BibleSearchStatus>("idle");
  const [results, setResults] = useState<LocalizedSearchResult[]>([]);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    options.cancelPrimary();
    options.cancelSecondary();
    const trimmed = query.trim();
    if (!options.enabled || Array.from(trimmed).length < 2) {
      setStatus("idle");
      setResults([]);
      return;
    }

    if (options.primaryStatus === "error") {
      setStatus("error");
      setResults([]);
      return;
    }
    const secondarySettled = !options.secondaryLanguage || options.secondaryStatus === "ready" || options.secondaryStatus === "error";
    if (options.primaryStatus !== "ready" || !secondarySettled) {
      setStatus("loading");
      setResults([]);
      return;
    }

    setStatus("loading");
    setResults([]);
    const timer = window.setTimeout(() => {
      const searches: Array<Promise<{ language: BibleLanguage; results: SearchResult[] | null }>> = [
        options.searchPrimary(trimmed).then((found) => ({ language: options.primaryLanguage, results: found })),
      ];
      if (options.secondaryLanguage && options.secondaryStatus === "ready") {
        searches.push(options.searchSecondary(trimmed).then((found) => ({ language: options.secondaryLanguage!, results: found })));
      }
      void Promise.all(searches).then((responses) => {
        if (generation !== generationRef.current) return;
        if (responses.every(({ results: found }) => found === null)) {
          setStatus("error");
          return;
        }
        const languageOrder = new Map(responses.map(({ language }, index) => [language, index]));
        const merged = responses.flatMap(({ language, results: found }) => (found ?? []).map((result) => ({ ...result, bibleLanguage: language })));
        merged.sort((left, right) => right.score - left.score || (languageOrder.get(left.bibleLanguage) ?? 0) - (languageOrder.get(right.bibleLanguage) ?? 0));
        setResults(merged.slice(0, 30));
        setStatus("ready");
      });
    }, 140);

    return () => {
      window.clearTimeout(timer);
      generationRef.current += 1;
      options.cancelPrimary();
      options.cancelSecondary();
    };
  }, [options.cancelPrimary, options.cancelSecondary, options.enabled, options.primaryLanguage, options.primaryStatus, options.searchPrimary, options.searchSecondary, options.secondaryLanguage, options.secondaryStatus, query]);

  return { query, setQuery, status, results } as const;
}
