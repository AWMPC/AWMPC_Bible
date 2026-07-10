import type { Book } from "../data/contracts";

const OLD_TESTAMENT_BOOKS = new Set([
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
  "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
  "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
]);

const NEW_TESTAMENT_BOOKS = new Set([
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
]);

export type TestamentBooks = Readonly<{
  old: Book[];
  new: Book[];
  other: Book[];
}>;

export function groupBooksByTestament(books: Book[]): TestamentBooks {
  const old: Book[] = [];
  const next: Book[] = [];
  const other: Book[] = [];
  for (const book of books) {
    if (OLD_TESTAMENT_BOOKS.has(book.name)) old.push(book);
    else if (NEW_TESTAMENT_BOOKS.has(book.name)) next.push(book);
    else other.push(book);
  }
  return { old, new: next, other };
}
