import { isBibleLanguage, type BibleLanguage } from "../data/languages.ts";

export type ReaderLocation = Readonly<{ book: string; chapter: string }>;

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;
type StoredLocations = Partial<Record<BibleLanguage, ReaderLocation>>;

const STORAGE_KEY = "awmpc-bible.reader-location.v1";
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const MAX_BOOK_NAME_LENGTH = 160;

function normalizeLocation(value: unknown): ReaderLocation | null {
  if (!value || typeof value !== "object") return null;
  const { book, chapter } = value as Partial<ReaderLocation>;
  if (typeof book !== "string" || book.length === 0 || book.length > MAX_BOOK_NAME_LENGTH || book.trim() !== book) return null;
  if (typeof chapter !== "string" || !POSITIVE_INTEGER.test(chapter)) return null;
  return { book, chapter };
}

function normalizeLocations(value: unknown): StoredLocations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([language, location]) => {
    const normalized = normalizeLocation(location);
    return isBibleLanguage(language) && normalized ? [[language, normalized]] : [];
  })) as StoredLocations;
}

export class LocalReaderLocationStore {
  private readonly storage: MinimalStorage;

  constructor(storage: MinimalStorage) {
    this.storage = storage;
  }

  load(language: BibleLanguage): ReaderLocation | null {
    try {
      return normalizeLocations(JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "null"))[language] ?? null;
    } catch {
      return null;
    }
  }

  save(language: BibleLanguage, location: ReaderLocation): void {
    const normalized = normalizeLocation(location);
    if (!normalized) return;
    try {
      const locations = normalizeLocations(JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "null"));
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ ...locations, [language]: normalized }));
    } catch {
      // The current reading position remains available for this session.
    }
  }
}
