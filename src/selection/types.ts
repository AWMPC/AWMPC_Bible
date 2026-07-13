import type { Verse } from "../data/contracts";
import type { HistorySelection } from "../history/HistoryStore";

export type VerseLocation = Readonly<{ book: string; chapter: string; verse: string }>;
export type ChooseVerseOptions = Readonly<{ prefetchedVerses?: Verse[]; recordHistory?: boolean; historySelection?: HistorySelection }>;
export type VerseSelectionResult =
  | Readonly<{ status: "selected" }>
  | Readonly<{ status: "ignored" }>
  | Readonly<{ status: "failed"; error: unknown }>;
