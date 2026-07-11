export type Book = { name: string; chapters: string[] };
export type Verse = { number: string; text: string };
export type ChapterTarget = "reader" | "navigation" | "selection";

export type WorkerRequest =
  | { type: "load" }
  | { type: "chapter"; requestId: number; target: ChapterTarget; book: string; chapter: string };

export type WorkerResponse =
  | { type: "ready"; books: Book[] }
  | { type: "chapter"; requestId: number; target: ChapterTarget; book: string; chapter: string; verses: Verse[] }
  | { type: "error"; requestId: number; target: ChapterTarget; message: string }
  | { type: "error"; message: string };
