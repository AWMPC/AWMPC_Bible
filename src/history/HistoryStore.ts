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

const STORAGE_KEY = "quiet-reader.history.v1";
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
      const parsed: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, this.limit) : [];
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
