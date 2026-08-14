import { useEffect, useRef, useState } from "react";
import { fetchDatasetText } from "../data/fetchDataset.ts";
import { bibleDatasetUrl, type BibleLanguage } from "../data/languages.ts";
import { parseLibrary, readChapter, type Library } from "../data/library.ts";
import type { HistoryEntry } from "./HistoryStore.ts";

const MAX_CONCURRENT_DATASETS = 3;
const MAX_PREVIEW_LENGTH = 280;

export type HistoryVersePreview = Readonly<{
  status: "loading" | "ready" | "unavailable";
  text?: string;
}>;

type HistoryLocation = Pick<HistoryEntry, "book" | "chapter" | "verse">;

export function resolveHistoryVersePreview(library: Library, entry: HistoryLocation): string | null {
  try {
    const text = readChapter(library, entry.book, entry.chapter).find(({ number }) => number === entry.verse)?.text.trim();
    return text ? text.slice(0, MAX_PREVIEW_LENGTH) : null;
  } catch {
    return null;
  }
}

export function useHistoryVersePreviews(entries: readonly HistoryEntry[]): ReadonlyMap<string, HistoryVersePreview> {
  const [previews, setPreviews] = useState<ReadonlyMap<string, HistoryVersePreview>>(() => new Map());
  const cacheRef = useRef(new Map<BibleLanguage, Library | null>());
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    const controller = new AbortController();
    const entriesByLanguage = new Map<BibleLanguage, HistoryEntry[]>();
    for (const entry of entries) {
      const matches = entriesByLanguage.get(entry.bibleLanguage) ?? [];
      matches.push(entry);
      entriesByLanguage.set(entry.bibleLanguage, matches);
    }
    setPreviews(new Map(entries.map((entry) => [entry.id, { status: "loading" as const }])));
    const baseUrl = new URL(import.meta.env.BASE_URL, document.baseURI).href;

    const settleLanguage = async (language: BibleLanguage, languageEntries: readonly HistoryEntry[]) => {
      let library = cacheRef.current.get(language);
      if (library === undefined) {
        try {
          library = parseLibrary(await fetchDatasetText(bibleDatasetUrl(language, baseUrl), { signal: controller.signal }));
        } catch {
          if (controller.signal.aborted) return;
          library = null;
        }
        cacheRef.current.set(language, library);
      }
      if (controller.signal.aborted || generation !== generationRef.current) return;
      setPreviews((current) => {
        const next = new Map(current);
        for (const entry of languageEntries) {
          const text = library ? resolveHistoryVersePreview(library, entry) : null;
          next.set(entry.id, text ? { status: "ready", text } : { status: "unavailable" });
        }
        return next;
      });
    };

    const languages = [...entriesByLanguage.entries()];
    let nextLanguage = 0;
    const work = async () => {
      while (!controller.signal.aborted) {
        const candidate = languages[nextLanguage++];
        if (!candidate) return;
        await settleLanguage(candidate[0], candidate[1]);
      }
    };
    void Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_DATASETS, languages.length) }, work));

    return () => {
      controller.abort();
    };
  }, [entries]);

  return previews;
}
