import { useCallback } from "react";
import { useCloudAccount } from "../cloud/useCloudAccount";
import type { CloudSnapshot } from "../cloud/contracts";
import { useBibleHistory } from "../history/useBibleHistory";
import { useSearchHistory } from "../search/useSearchHistory";
import { DEFAULT_BIBLE_SETTINGS } from "../settings/SettingsStore";
import type { BibleLanguage } from "../settings/bibleLanguage";
import { useBibleSettings } from "../settings/useBibleSettings";

const DEFAULT_CLOUD_SNAPSHOT: CloudSnapshot = { settings: DEFAULT_BIBLE_SETTINGS, history: [], searchHistory: [] };

export function useReaderPersistence(initialLanguage?: BibleLanguage) {
  const settingsStore = useBibleSettings(initialLanguage);
  const historyStore = useBibleHistory();
  const searchHistoryStore = useSearchHistory();
  const applyCloudSnapshot = useCallback((snapshot: CloudSnapshot) => {
    settingsStore.replace(snapshot.settings);
    historyStore.replace(snapshot.history);
    searchHistoryStore.replace(snapshot.searchHistory);
  }, [historyStore.replace, searchHistoryStore.replace, settingsStore.replace]);
  const cloud = useCloudAccount({
    snapshot: {
      settings: settingsStore.settings,
      history: historyStore.entries,
      searchHistory: searchHistoryStore.entries,
    },
    defaults: DEFAULT_CLOUD_SNAPSHOT,
    apply: applyCloudSnapshot,
  });

  return { settingsStore, historyStore, searchHistoryStore, cloud } as const;
}
