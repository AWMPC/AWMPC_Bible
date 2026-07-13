import type { Book, Verse } from "./contracts";

export function pairedBookName(primaryBook: string, primaryBooks: readonly Book[], secondaryBooks: readonly Book[]): string | null {
  const index = primaryBooks.findIndex(({ name }) => name === primaryBook);
  return index >= 0 ? secondaryBooks[index]?.name ?? null : null;
}

export function versesByNumber(verses: readonly Verse[]): ReadonlyMap<string, Verse> {
  return new Map(verses.map((verse) => [verse.number, verse]));
}
