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
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const STORAGE_KEY = "awmpc-bible.history.v1";
const LEGACY_STORAGE_KEY = "quiet-reader.history.v1";
const DEFAULT_LIMIT = 200;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

export function mergeHistoryEntries(
  preferred: readonly HistoryEntry[],
  fallback: readonly HistoryEntry[],
  limit = DEFAULT_LIMIT,
): HistoryEntry[] {
  const seen = new Set<string>();
  return [...preferred, ...fallback].filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, limit);
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 160 && value.trim() === value;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.valueOf()) && timestamp.toISOString() === value;
}

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HistoryEntry>;
  return isBoundedText(entry.id)
    && isBoundedText(entry.book)
    && typeof entry.chapter === "string"
    && POSITIVE_INTEGER.test(entry.chapter)
    && typeof entry.verse === "string"
    && POSITIVE_INTEGER.test(entry.verse)
    && isCanonicalTimestamp(entry.visitedAt);
}

export class LocalHistoryStore implements HistoryStore {
  private readonly storage: MinimalStorage;
  private readonly limit: number;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private mutationQueue: Promise<void> = Promise.resolve();

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
    return this.enqueueMutation(async () => {
      try {
        const current = await this.list();
        this.storage.setItem(STORAGE_KEY, JSON.stringify([entry, ...current].slice(0, this.limit)));
      } catch {
        // Storage can be unavailable or full; the caller still retains this session entry.
      }
      return entry;
    });
  }

  async remove(id: string): Promise<void> {
    return this.enqueueMutation(async () => {
      try {
        const entries = (await this.list()).filter((entry) => entry.id !== id);
        this.storage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch {
        // The in-memory view remains authoritative when storage is unavailable.
      }
    });
  }

  async clear(): Promise<void> {
    return this.enqueueMutation(() => {
      try {
        this.storage.removeItem(STORAGE_KEY);
        this.storage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // The in-memory view still clears.
      }
    });
  }

  private enqueueMutation<T>(mutation: () => T | Promise<T>): Promise<T> {
    const queued = this.mutationQueue.then(mutation, mutation);
    this.mutationQueue = queued.then(() => undefined, () => undefined);
    return queued;
  }
}
