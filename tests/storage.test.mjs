import test from "node:test";
import assert from "node:assert/strict";
import { LocalHistoryStore, mergeHistoryEntries } from "../src/history/HistoryStore.ts";
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

test("history rejects malformed references and timestamps", async () => {
  const valid = { id: "valid", book: "John", chapter: "3", verse: "16", visitedAt: "2026-07-10T20:30:00.000Z" };
  const malformed = [
    { ...valid, id: " padded " },
    { ...valid, book: " John" },
    { ...valid, chapter: "03" },
    { ...valid, chapter: "0" },
    { ...valid, verse: "sixteen" },
    { ...valid, visitedAt: "yesterday" },
    { ...valid, visitedAt: "2026-07-10T20:30:00Z" },
  ];
  const storage = { getItem: () => JSON.stringify([valid, ...malformed]), setItem: () => {} };
  assert.deepEqual(await new LocalHistoryStore(storage).list(), [valid]);
});

test("history hydration preserves entries recorded while loading", () => {
  const hydrated = [
    { id: "older", book: "John", chapter: "3", verse: "15", visitedAt: "2026-07-10T20:29:00.000Z" },
    { id: "shared", book: "John", chapter: "3", verse: "16", visitedAt: "2026-07-10T20:30:00.000Z" },
  ];
  const recorded = [
    { id: "new", book: "Romans", chapter: "8", verse: "1", visitedAt: "2026-07-10T20:31:00.000Z" },
    hydrated[1],
  ];
  assert.deepEqual(mergeHistoryEntries(recorded, hydrated), [recorded[0], hydrated[1], hydrated[0]]);
  assert.deepEqual(mergeHistoryEntries(recorded, hydrated, 2), [recorded[0], hydrated[1]]);
});

test("settings validate, round-trip, and migrate independently", () => {
  const values = new Map([["quiet-reader.settings.v1", '{"textScale":"large"}']]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = new LocalSettingsStore(storage);
  assert.deepEqual(store.load(), { textScale: "large", verseFont: "system-serif", appearance: "auto" });
  store.save({ textScale: "compact", verseFont: "monospace", appearance: "day" });
  assert.deepEqual(store.load(), { textScale: "compact", verseFont: "monospace", appearance: "day" });
});
