import type { HistoryEntry } from "../history/HistoryStore";
import type { BibleSettings } from "../settings/SettingsStore";

export type CloudSnapshot = Readonly<{
  settings: BibleSettings;
  history: HistoryEntry[];
  searchHistory: string[];
}>;

export type CloudUser = Readonly<{
  uid: string;
  displayName: string;
  photoUrl: string | null;
}>;

export type CloudAccountState = Readonly<{
  status: "loading" | "unavailable" | "signed-out" | "syncing" | "ready" | "error";
  user: CloudUser | null;
  message?: string;
}>;

export interface CloudGateway {
  observeAuth(listener: (user: CloudUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  hydrate(uid: string, local: CloudSnapshot, signal: AbortSignal): Promise<CloudSnapshot>;
  save(uid: string, snapshot: CloudSnapshot, signal: AbortSignal): Promise<void>;
}
