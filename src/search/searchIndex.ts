import type { SearchResult } from "../data/contracts.ts";
import { listBooks, readChapter, type Library } from "../data/library.ts";

export const SEARCH_LIMITS = Object.freeze({ queryCodePoints: 120, results: 30, excerptCodePoints: 240, queryTokens: 8 });

export type SearchDocument = Readonly<Omit<SearchResult, "score"> & { normalized: string; aliases?: readonly string[]; ordinal: number }>;

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function hyphenSearchAliases(value: string): string[] {
  const compounds = value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+(?:\p{Pd}[\p{L}\p{N}]+)+/gu) ?? [];
  return [...new Set(compounds.map((compound) => compound.replace(/\p{Pd}/gu, "")))];
}

function boundedCodePoints(value: string, limit: number): string {
  return Array.from(value).slice(0, limit).join("");
}

export function buildSearchIndex(library: Library): SearchDocument[] {
  const documents: SearchDocument[] = [];
  for (const book of listBooks(library)) {
    for (const chapter of book.chapters) {
      for (const verse of readChapter(library, book.name, chapter)) {
        const normalized = normalizeSearchText(verse.text);
        const aliases = hyphenSearchAliases(verse.text);
        documents.push({
          book: book.name,
          chapter,
          verse: verse.number,
          text: verse.text,
          normalized,
          ...(aliases.length ? { aliases } : {}),
          ordinal: documents.length,
        });
      }
    }
  }
  return documents;
}

function editDistanceWithin(left: string, right: string, maximum: number): number | null {
  if (Math.abs(left.length - right.length) > maximum) return null;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const value = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      current[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return null;
    previous = current;
  }
  return previous[right.length] <= maximum ? previous[right.length] : null;
}

function fuzzyAllowance(token: string): number {
  if (/\p{Script=Hangul}/u.test(token)) return token.length >= 2 ? 1 : 0;
  if (token.length >= 8) return 2;
  return token.length >= 4 ? 1 : 0;
}

function tokenMatchScore(queryToken: string, documentToken: string): number {
  if (documentToken === queryToken) return 50;
  if (queryToken.length >= 2 && documentToken.startsWith(queryToken)) return 36;
  if (queryToken.length >= 3 && documentToken.includes(queryToken)) return 26;
  const allowance = fuzzyAllowance(queryToken);
  if (!allowance) return 0;
  const distance = editDistanceWithin(queryToken, documentToken, allowance);
  return distance === null ? 0 : 20 - distance * 4;
}

function documentScore(document: SearchDocument, normalizedQuery: string, queryTokens: string[], tokenCaches: Array<Map<string, number>>): number {
  if (document.normalized.includes(normalizedQuery)) return 240 + queryTokens.length * 50;
  if (queryTokens.length === 1 && document.aliases?.includes(normalizedQuery)) return 220 + queryTokens.length * 50;
  const documentTokens = document.normalized.split(" ");
  let score = 0;
  for (let index = 0; index < queryTokens.length; index += 1) {
    const queryToken = queryTokens[index];
    const cache = tokenCaches[index];
    let best = 0;
    for (const documentToken of documentTokens) {
      let match = cache.get(documentToken);
      if (match === undefined) {
        match = tokenMatchScore(queryToken, documentToken);
        cache.set(documentToken, match);
      }
      best = Math.max(best, match);
    }
    if (!best) return 0;
    score += best;
  }
  return score;
}

export function searchDocuments(documents: readonly SearchDocument[], query: string, requestedLimit: number = SEARCH_LIMITS.results): SearchResult[] {
  const boundedQuery = boundedCodePoints(query.trim(), SEARCH_LIMITS.queryCodePoints);
  const normalizedQuery = normalizeSearchText(boundedQuery);
  if (Array.from(normalizedQuery).length < 2) return [];
  const queryTokens = normalizedQuery.split(" ").filter(Boolean).slice(0, SEARCH_LIMITS.queryTokens);
  const tokenCaches = queryTokens.map(() => new Map<string, number>());
  const limit = Math.max(1, Math.min(SEARCH_LIMITS.results, Math.floor(requestedLimit) || SEARCH_LIMITS.results));
  return documents
    .map((document) => ({ document, score: documentScore(document, normalizedQuery, queryTokens, tokenCaches) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.document.ordinal - right.document.ordinal)
    .slice(0, limit)
    .map(({ document, score }) => ({
      book: document.book,
      chapter: document.chapter,
      verse: document.verse,
      text: boundedCodePoints(document.text, SEARCH_LIMITS.excerptCodePoints),
      score,
    }));
}
