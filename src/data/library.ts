import type { Book, Footnote, Verse, VerseSegment } from "./contracts";

type VerseWithFootnotes = { segments: VerseSegment[]; footnotes: Footnote[] };
type VerseEntry = string | VerseWithFootnotes;
type Chapter = Record<string, VerseEntry>;
export type Library = Record<string, Record<string, Chapter>>;

export const LIMITS = Object.freeze({
  bytes: 8 * 1024 * 1024,
  books: 100,
  chapters: 2000,
  verses: 50000,
  key: 120,
  text: 4000,
  footnotesPerVerse: 50,
  segmentsPerVerse: 200,
  footnoteText: 2000,
});

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const POSITIVE_INTEGER_KEY = /^[1-9]\d*$/;

function ownObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertSafeKey(key: string): void {
  if (!key || key.length > LIMITS.key || BLOCKED_KEYS.has(key)) {
    throw new Error("The library contains an invalid key.");
  }
}

function assertNumericKey(key: string): void {
  assertSafeKey(key);
  if (!POSITIVE_INTEGER_KEY.test(key)) {
    throw new Error("Chapter and verse keys must be canonical positive integers.");
  }
}

export function numericKeys(value: object): string[] {
  return Object.keys(value).sort((a, b) => Number(a) - Number(b));
}

function validateVerseEntry(value: unknown): void {
  if (typeof value === "string") {
    if (value.length > LIMITS.text) throw new Error("A verse entry is invalid.");
    parseInlineFootnotes(value);
    return;
  }
  if (!ownObject(value) || Object.keys(value).some((key) => key !== "segments" && key !== "footnotes")) {
    throw new Error("A verse entry is invalid.");
  }
  if (!Array.isArray(value.segments) || !value.segments.length || value.segments.length > LIMITS.segmentsPerVerse || !Array.isArray(value.footnotes)
    || !value.footnotes.length || value.footnotes.length > LIMITS.footnotesPerVerse) {
    throw new Error("A verse footnote entry is invalid.");
  }
  const referenced = new Set<string>();
  let textLength = 0;
  for (const segment of value.segments) {
    if (typeof segment === "string") {
      textLength += segment.length;
    } else if (ownObject(segment) && Object.keys(segment).length === 1 && typeof segment.footnote === "string" && POSITIVE_INTEGER_KEY.test(segment.footnote)) {
      referenced.add(segment.footnote);
    } else {
      throw new Error("A verse footnote marker is invalid.");
    }
  }
  if (textLength > LIMITS.text || !referenced.size) throw new Error("A verse footnote entry is invalid.");
  const seen = new Set<string>();
  for (const candidate of value.footnotes) {
    if (!ownObject(candidate) || Object.keys(candidate).some((key) => key !== "number" && key !== "text")
      || typeof candidate.number !== "string" || !POSITIVE_INTEGER_KEY.test(candidate.number)
      || seen.has(candidate.number) || !referenced.has(candidate.number)
      || typeof candidate.text !== "string" || !candidate.text.length || candidate.text.length > LIMITS.footnoteText) {
      throw new Error("A verse footnote entry is invalid.");
    }
    seen.add(candidate.number);
  }
  if (seen.size !== referenced.size) throw new Error("A verse footnote marker is invalid.");
}

export function parseInlineFootnotes(value: string): Omit<Verse, "number"> {
  const footnotes: Footnote[] = [];
  const segments: VerseSegment[] = [];
  const marker = /\{([^{}]+)\}/g;
  let cursor = 0;
  for (const match of value.matchAll(marker)) {
    const text = match[1].trim();
    if (!text || text.length > LIMITS.footnoteText || footnotes.length >= LIMITS.footnotesPerVerse) {
      throw new Error("A verse footnote entry is invalid.");
    }
    if ((match.index ?? 0) > cursor) segments.push(value.slice(cursor, match.index));
    const number = String(footnotes.length + 1);
    segments.push({ footnote: number });
    footnotes.push({ number, text });
    cursor = (match.index ?? cursor) + match[0].length;
  }
  if (!footnotes.length) {
    if (value.includes("{") || value.includes("}")) throw new Error("A verse footnote marker is invalid.");
    return { text: value };
  }
  if (cursor < value.length) segments.push(value.slice(cursor));
  const visibleText = segments.filter((segment): segment is string => typeof segment === "string").join("");
  if (visibleText.includes("{") || visibleText.includes("}")) throw new Error("A verse footnote marker is invalid.");
  return { text: visibleText, segments, footnotes };
}

export function parseLibrary(text: string): Library {
  if (new TextEncoder().encode(text).byteLength > LIMITS.bytes) {
    throw new Error("The data file is too large.");
  }

  const value: unknown = JSON.parse(text);
  if (!ownObject(value)) throw new Error("The data root must be an object.");

  const books = Object.keys(value);
  if (!books.length || books.length > LIMITS.books) {
    throw new Error("The library has an unexpected number of books.");
  }

  let chapterCount = 0;
  let verseCount = 0;
  for (const book of books) {
    assertSafeKey(book);
    const chapters = value[book];
    if (!ownObject(chapters)) throw new Error("A book entry is invalid.");
    const chapterKeys = Object.keys(chapters);
    if (!chapterKeys.length) throw new Error("A book must contain at least one chapter.");
    for (const chapter of chapterKeys) {
      assertNumericKey(chapter);
      chapterCount += 1;
      const verses = chapters[chapter];
      if (!ownObject(verses)) throw new Error("A chapter entry is invalid.");
      const verseKeys = Object.keys(verses);
      if (!verseKeys.length) throw new Error("A chapter must contain at least one verse.");
      for (const verse of verseKeys) {
        assertNumericKey(verse);
        verseCount += 1;
        validateVerseEntry(verses[verse]);
      }
    }
  }

  if (chapterCount > LIMITS.chapters || verseCount > LIMITS.verses) {
    throw new Error("The library is larger than AWMPC Bible supports.");
  }
  return value as Library;
}

export function listBooks(library: Library): Book[] {
  return Object.keys(library).map((name) => ({ name, chapters: numericKeys(library[name]) }));
}

export function readChapter(library: Library, book: string, chapter: string): Verse[] {
  const value = Object.hasOwn(library, book) ? library[book] : undefined;
  const verses = value && Object.hasOwn(value, chapter) ? value[chapter] : undefined;
  if (!verses) throw new Error("That chapter is unavailable.");
  return numericKeys(verses).map((number) => {
    const entry = verses[number];
    return typeof entry === "string"
      ? { number, ...parseInlineFootnotes(entry) }
      : { number, text: entry.segments.filter((segment): segment is string => typeof segment === "string").join(""), segments: entry.segments, footnotes: entry.footnotes };
  });
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
