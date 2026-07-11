import type { Verse } from "../data/contracts";

export type VerseLocation = Readonly<{ book: string; chapter: string; verse: string }>;
export type ChooseVerseOptions = Readonly<{ prefetchedVerses?: Verse[]; recordHistory?: boolean }>;
