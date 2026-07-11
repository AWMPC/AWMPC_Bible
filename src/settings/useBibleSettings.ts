import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_APPEARANCE } from "./appearance";
import { LocalSettingsStore, type BibleSettings, type SettingsStore } from "./SettingsStore";
import { DEFAULT_TEXT_SCALE } from "./textScale";
import { DEFAULT_VERSE_FONT } from "./verseFont";

const DEFAULT_SETTINGS: BibleSettings = {
  textScale: DEFAULT_TEXT_SCALE,
  verseFont: DEFAULT_VERSE_FONT,
  appearance: DEFAULT_APPEARANCE,
};

const createLocalSettingsStore = () => new LocalSettingsStore(window.localStorage);

export function useBibleSettings(createStore: () => SettingsStore = createLocalSettingsStore) {
  const storeRef = useRef<SettingsStore | null>(null);
  const [settings, setSettings] = useState<BibleSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<BibleSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const store = createStore();
      storeRef.current = store;
      const loaded = store.load();
      settingsRef.current = loaded;
      setSettings(loaded);
    } catch {
      storeRef.current = null;
    }
    return () => { storeRef.current = null; };
  }, [createStore]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.appearance;
    root.dataset.appearance = settings.appearance;
    return () => {
      if (previous) root.dataset.appearance = previous;
      else delete root.dataset.appearance;
    };
  }, [settings.appearance]);

  const update = useCallback((patch: Partial<BibleSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    storeRef.current?.save(next);
  }, []);

  return { settings, update } as const;
}
