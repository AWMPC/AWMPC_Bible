import type { Book, Verse } from "./contracts";

type Chapter = Record<string, string>;
export type Library = Record<string, Record<string, Chapter>>;

export const LIMITS = Object.freeze({
  bytes: 8 * 1024 * 1024,
  books: 100,
  chapters: 2000,
  verses: 50000,
  key: 120,
  text: 4000,
});

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function ownObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertSafeKey(key: string): void {
  if (!key || key.length > LIMITS.key || BLOCKED_KEYS.has(key)) {
    throw new Error("The library contains an invalid key.");
  }
}

export function numericKeys(value: object): string[] {
  return Object.keys(value).sort((a, b) => Number(a) - Number(b));
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
    for (const chapter of Object.keys(chapters)) {
      assertSafeKey(chapter);
      chapterCount += 1;
      const verses = chapters[chapter];
      if (!ownObject(verses)) throw new Error("A chapter entry is invalid.");
      for (const verse of Object.keys(verses)) {
        assertSafeKey(verse);
        verseCount += 1;
        const verseText = verses[verse];
        if (typeof verseText !== "string" || verseText.length > LIMITS.text) {
          throw new Error("A verse entry is invalid.");
        }
      }
    }
  }

  if (chapterCount > LIMITS.chapters || verseCount > LIMITS.verses) {
    throw new Error("The library is larger than this reader supports.");
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
  return numericKeys(verses).map((number) => ({ number, text: verses[number] }));
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
