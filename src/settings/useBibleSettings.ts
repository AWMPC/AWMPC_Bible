import { useCallback, useEffect, useRef, useState } from "react";
import type { BibleLanguage } from "./bibleLanguage";
import { DEFAULT_BIBLE_SETTINGS, LocalSettingsStore, normalizeBibleSettings, withPrimaryBibleLanguage, withSecondaryBibleLanguage, type BibleSettings, type SettingsStore } from "./SettingsStore";

const createLocalSettingsStore = () => new LocalSettingsStore(window.localStorage);

export function useBibleSettings(initialBibleLanguage?: BibleLanguage, createStore: () => SettingsStore = createLocalSettingsStore) {
  const initialRef = useRef<{ store: SettingsStore | null; settings: BibleSettings } | null>(null);
  if (!initialRef.current) {
    try {
      const store = createStore();
      const stored = store.load();
      initialRef.current = { store, settings: initialBibleLanguage ? withPrimaryBibleLanguage(stored, initialBibleLanguage) : stored };
    } catch {
      initialRef.current = { store: null, settings: initialBibleLanguage ? withPrimaryBibleLanguage(DEFAULT_BIBLE_SETTINGS, initialBibleLanguage) : DEFAULT_BIBLE_SETTINGS };
    }
  }
  const storeRef = useRef<SettingsStore | null>(initialRef.current.store);
  const [settings, setSettings] = useState<BibleSettings>(initialRef.current.settings);
  const settingsRef = useRef<BibleSettings>(initialRef.current.settings);

  useEffect(() => {
    storeRef.current = initialRef.current?.store ?? null;
    return () => { storeRef.current = null; };
  }, []);

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
    const next = normalizeBibleSettings({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    setSettings(next);
    storeRef.current?.save(next);
  }, []);

  const replace = useCallback((value: unknown) => {
    const next = normalizeBibleSettings(value);
    settingsRef.current = next;
    setSettings(next);
    storeRef.current?.save(next);
  }, []);

  const setPrimaryBibleLanguage = useCallback((language: BibleLanguage) => {
    const next = withPrimaryBibleLanguage(settingsRef.current, language);
    settingsRef.current = next;
    setSettings(next);
    storeRef.current?.save(next);
  }, []);

  const setSecondaryBibleLanguage = useCallback((language: BibleLanguage | null) => {
    const next = withSecondaryBibleLanguage(settingsRef.current, language);
    settingsRef.current = next;
    setSettings(next);
    storeRef.current?.save(next);
  }, []);

  return { settings, update, replace, setPrimaryBibleLanguage, setSecondaryBibleLanguage } as const;
}
