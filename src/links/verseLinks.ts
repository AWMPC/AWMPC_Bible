import { LIMITS } from "../data/library.ts";
import { isBibleLanguage, type BibleLanguage } from "../settings/bibleLanguage.ts";

const POSITIVE_INTEGER = /^[1-9]\d*$/;

export type LinkedVerse = Readonly<{
  bibleLanguage: BibleLanguage;
  book: string;
  chapter: string;
  verse: string;
}>;

function isSafeReference(value: LinkedVerse): boolean {
  return value.book.length > 0
    && value.book.length <= LIMITS.key
    && POSITIVE_INTEGER.test(value.chapter)
    && POSITIVE_INTEGER.test(value.verse);
}

export function createVerseLink(location: LinkedVerse, currentUrl: string): string {
  if (!isSafeReference(location)) throw new Error("The verse reference is invalid.");
  const url = new URL(currentUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("lang", location.bibleLanguage);
  url.searchParams.set("book", location.book);
  url.searchParams.set("chapter", location.chapter);
  url.searchParams.set("verse", location.verse);
  return url.href;
}

export function parseVerseLink(currentUrl: string): LinkedVerse | null {
  try {
    const url = new URL(currentUrl);
    const bibleLanguage = url.searchParams.get("lang");
    const book = url.searchParams.get("book");
    const chapter = url.searchParams.get("chapter");
    const verse = url.searchParams.get("verse");
    if (!isBibleLanguage(bibleLanguage) || book === null || chapter === null || verse === null) return null;
    const linked: LinkedVerse = { bibleLanguage, book, chapter, verse };
    return isSafeReference(linked) ? linked : null;
  } catch {
    return null;
  }
}

export function formatVerseForCopy(location: Omit<LinkedVerse, "bibleLanguage"> & Readonly<{ text: string }>): string {
  return `${location.text}\n— ${location.book} ${location.chapter}:${location.verse}`;
}
