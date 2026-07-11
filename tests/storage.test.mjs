import test from "node:test";
import assert from "node:assert/strict";
import { LocalHistoryStore } from "../src/history/HistoryStore.ts";
import { LocalSettingsStore } from "../src/settings/SettingsStore.ts";

test("history timestamps, bounds, validates, and migrates references", async () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = new LocalHistoryStore(storage, 2, () => new Date("2026-07-10T20:30:00.000Z"), () => `entry-${values.size}`);
  await store.add({ book: "Example", chapter: "1", verse: "1" });
  await store.add({ book: "Example", chapter: "1", verse: "2" });
  await store.add({ book: "Example", chapter: "1", verse: "3" });
  const entries = await store.list();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].verse, "3");
  assert.equal(entries[0].visitedAt, "2026-07-10T20:30:00.000Z");
  assert.equal("text" in entries[0], false);

  const legacy = { id: "legacy", book: "Example", chapter: "1", verse: "2", visitedAt: "2026-07-10T20:30:00.000Z" };
  const migrated = new Map([["quiet-reader.history.v1", JSON.stringify([legacy])]]);
  const migratedStorage = { getItem: (key) => migrated.get(key) ?? null, setItem: (key, value) => migrated.set(key, value) };
  assert.deepEqual(await new LocalHistoryStore(migratedStorage).list(), [legacy]);
  assert.equal(migrated.has("awmpc-bible.history.v1"), true);
});

test("history and settings tolerate malformed or unavailable storage", async () => {
  assert.deepEqual(await new LocalHistoryStore({ getItem: () => "bad", setItem: () => {} }).list(), []);
  const unavailableHistory = new LocalHistoryStore({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, 2, () => new Date(0), () => "id");
  assert.equal((await unavailableHistory.add({ book: "Example", chapter: "1", verse: "1" })).id, "id");

  const unavailableSettings = new LocalSettingsStore({ getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  assert.deepEqual(unavailableSettings.load(), { textScale: "standard", verseFont: "system-serif", appearance: "auto" });
  assert.doesNotThrow(() => unavailableSettings.save({ textScale: "large", verseFont: "rounded", appearance: "night" }));
});

test("settings validate, round-trip, and migrate independently", () => {
  const values = new Map([["quiet-reader.settings.v1", '{"textScale":"large"}']]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = new LocalSettingsStore(storage);
  assert.deepEqual(store.load(), { textScale: "large", verseFont: "system-serif", appearance: "auto" });
  store.save({ textScale: "compact", verseFont: "monospace", appearance: "day" });
  assert.deepEqual(store.load(), { textScale: "compact", verseFont: "monospace", appearance: "day" });
});
