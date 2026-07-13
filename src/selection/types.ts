import type { Verse } from "../data/contracts";

export type VerseLocation = Readonly<{ book: string; chapter: string; verse: string }>;
export type ChooseVerseOptions = Readonly<{ prefetchedVerses?: Verse[]; recordHistory?: boolean }>;
export type VerseSelectionResult =
  | Readonly<{ status: "selected" }>
  | Readonly<{ status: "ignored" }>
  | Readonly<{ status: "failed"; error: unknown }>;
