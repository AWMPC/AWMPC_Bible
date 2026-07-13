import type { BibleLanguage } from "./languages";

export type Book = { name: string; chapters: string[] };
export type Footnote = { number: string; text: string };
export type FootnoteMarker = { footnote: string };
export type VerseSegment = string | FootnoteMarker;
export type Verse = { number: string; text: string; segments?: VerseSegment[]; footnotes?: Footnote[] };
export type ChapterTarget = "reader" | "navigation" | "selection";

export type WorkerRequest =
  | { type: "load"; language: BibleLanguage; datasetUrl: string; baseUrl: string }
  | { type: "chapter"; requestId: number; target: ChapterTarget; book: string; chapter: string };

export type WorkerResponse =
  | { type: "ready"; language: BibleLanguage; books: Book[] }
  | { type: "chapter"; requestId: number; target: ChapterTarget; book: string; chapter: string; verses: Verse[] }
  | { type: "error"; requestId: number; target: ChapterTarget; message: string }
  | { type: "error"; message: string };
