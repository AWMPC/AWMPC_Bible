export type HistoryEntry = Readonly<{
  id: string;
  book: string;
  chapter: string;
  verse: string;
  visitedAt: string;
}>;

export type HistorySelection = Pick<HistoryEntry, "book" | "chapter" | "verse">;

export interface HistoryStore {
  list(): Promise<HistoryEntry[]>;
  add(selection: HistorySelection): Promise<HistoryEntry>;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "awmpc-bible.history.v1";
const LEGACY_STORAGE_KEY = "quiet-reader.history.v1";
const DEFAULT_LIMIT = 200;

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HistoryEntry>;
  return [entry.id, entry.book, entry.chapter, entry.verse, entry.visitedAt]
    .every((field) => typeof field === "string" && field.length > 0 && field.length <= 160);
}

export class LocalHistoryStore implements HistoryStore {
  private readonly storage: MinimalStorage;
  private readonly limit: number;
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(
    storage: MinimalStorage,
    limit = DEFAULT_LIMIT,
    now = () => new Date(),
    createId = () => crypto.randomUUID(),
  ) {
    this.storage = storage;
    this.limit = limit;
    this.now = now;
    this.createId = createId;
  }

  async list(): Promise<HistoryEntry[]> {
    try {
      const current = this.storage.getItem(STORAGE_KEY);
      const legacy = current === null ? this.storage.getItem(LEGACY_STORAGE_KEY) : null;
      const parsed: unknown = JSON.parse(current ?? legacy ?? "[]");
      const entries = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, this.limit) : [];
      if (current === null && legacy !== null) {
        try { this.storage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* Legacy data remains usable. */ }
      }
      return entries;
    } catch {
      return [];
    }
  }

  async add(selection: HistorySelection): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: this.createId(),
      ...selection,
      visitedAt: this.now().toISOString(),
    };
    try {
      const current = await this.list();
      this.storage.setItem(STORAGE_KEY, JSON.stringify([entry, ...current].slice(0, this.limit)));
    } catch {
      // Storage can be unavailable or full; the caller still retains this session entry.
    }
    return entry;
  }
}
