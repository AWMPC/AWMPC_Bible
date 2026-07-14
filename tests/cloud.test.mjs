import test from "node:test";
import assert from "node:assert/strict";
import { readFirebaseClientConfig } from "../src/cloud/config.ts";
import { cloudDocumentPatch, migrateCloudDocument, reconcileCloudSnapshots, reconcileConcurrentHydration } from "../src/cloud/migration.ts";
import { cloudOwnerTag, loadCloudBaseline, saveCloudBaseline } from "../src/cloud/baseline.ts";
import { isRetryableCloudError, withBackoff } from "../src/cloud/retry.ts";
import { LocalSearchHistoryStore, normalizeSearchHistory } from "../src/search/SearchHistoryStore.ts";
import { safePhotoUrl } from "../src/cloud/firebaseGateway.ts";

const settings = { textScale: "standard", verseFont: "system-serif", appearance: "auto", primaryBibleLanguage: "en", secondaryBibleLanguage: null };
const entry = { id: "local-1", bibleLanguage: "ko", book: "요한복음", chapter: "3", verse: "16", visitedAt: "2026-07-13T20:00:00.000Z" };

test("Firebase configuration is opt-in and rejects malformed deployment values", () => {
  assert.equal(readFirebaseClientConfig({}), null);
  assert.equal(readFirebaseClientConfig({ VITE_FIREBASE_API_KEY: "key", VITE_FIREBASE_AUTH_DOMAIN: "https://bad.example", VITE_FIREBASE_PROJECT_ID: "project", VITE_FIREBASE_APP_ID: "app" }), null);
  assert.deepEqual(readFirebaseClientConfig({ VITE_FIREBASE_API_KEY: "key", VITE_FIREBASE_AUTH_DOMAIN: "auth.example", VITE_FIREBASE_PROJECT_ID: "project-id", VITE_FIREBASE_APP_ID: "app" }), {
    apiKey: "key", authDomain: "auth.example", projectId: "project-id", appId: "app",
  });
});

test("profile photos accept only bounded HTTPS Google-hosted URLs", () => {
  assert.equal(safePhotoUrl("https://lh3.googleusercontent.com/avatar"), "https://lh3.googleusercontent.com/avatar");
  assert.equal(safePhotoUrl("http://lh3.googleusercontent.com/avatar"), null);
  assert.equal(safePhotoUrl("https://googleusercontent.com.attacker.example/avatar"), null);
  assert.equal(safePhotoUrl("https://example.com/avatar"), null);
});

test("cloud migration adopts legacy fields and preserves local-only data", () => {
  const migrated = migrateCloudDocument({
    themeMode: "dark",
    font: 125,
    history: [{ book: "John", ch: 3, verse: 16, selectedAt: "2026-07-12T20:00:00.000Z" }],
    searchHistory: [" grace ", "GRACE", "hope"],
    season: "preserved-by-merge",
  }, { settings, history: [entry], searchHistory: ["faith"] });
  assert.equal(migrated.settings.appearance, "night");
  assert.equal(migrated.settings.textScale, "large");
  assert.deepEqual(migrated.history.map(({ book }) => book), ["John", "요한복음"]);
  assert.deepEqual(migrated.searchHistory, ["grace", "hope", "faith"]);

  const marker = Object.freeze({ server: "timestamp" });
  const patch = cloudDocumentPatch(migrated, marker);
  assert.equal(patch.season, undefined);
  assert.equal(patch.themeMode, "dark");
  assert.equal(patch.font, 125);
  assert.equal(patch.awmpcBible.schemaVersion, 2);
  assert.equal(patch.awmpcBible.updatedAt, marker);
  assert.equal(patch.history.length, 2);
});

test("canonical empty history stays cleared and partial settings preserve valid fallback fields", () => {
  const local = { settings: { ...settings, verseFont: "monospace", primaryBibleLanguage: "ko" }, history: [entry], searchHistory: ["faith"] };
  const migrated = migrateCloudDocument({
    history: [{ book: "John", ch: 3, verse: 16, selectedAt: "2026-07-12T20:00:00.000Z" }],
    awmpcBible: { schemaVersion: 1, settings: { appearance: "night" }, history: [], searchHistory: [] },
  }, local);
  assert.equal(migrated.settings.appearance, "night");
  assert.equal(migrated.settings.verseFont, "monospace");
  assert.equal(migrated.settings.primaryBibleLanguage, "ko");
  assert.deepEqual(migrated.history, [entry]);
  assert.deepEqual(migrated.searchHistory, ["faith"]);
  assert.throws(() => migrateCloudDocument({ awmpcBible: { schemaVersion: 99 } }, local), /newer schema/);
});

test("three-way cloud reconciliation preserves additions and makes removals durable", () => {
  const second = { ...entry, id: "second", verse: "17" };
  const third = { ...entry, id: "third", verse: "18" };
  const baseline = { settings, history: [entry], searchHistory: ["faith"] };
  const merged = reconcileCloudSnapshots(
    baseline,
    { settings: { ...settings, appearance: "night" }, history: [second], searchHistory: ["grace"] },
    { settings: { ...settings, textScale: "large" }, history: [entry, third], searchHistory: ["faith", "mercy"] },
  );
  assert.equal(merged.settings.appearance, "night");
  assert.equal(merged.settings.textScale, "large");
  assert.deepEqual(merged.history.map(({ id }) => id), ["second", "third"]);
  assert.deepEqual(merged.searchHistory, ["grace", "mercy"]);

  const staleDevice = reconcileCloudSnapshots(baseline, baseline, { ...baseline, history: [], searchHistory: [] });
  assert.deepEqual(staleDevice.history, []);
  assert.deepEqual(staleDevice.searchHistory, []);
});

test("cloud baselines are owner-isolated and store no raw Firebase UID", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const uid = "private-user-identifier";
  const owner = cloudOwnerTag(uid);
  saveCloudBaseline(storage, owner, { settings, history: [entry], searchHistory: ["faith"] });
  assert.deepEqual(loadCloudBaseline(storage, owner), { settings, history: [entry], searchHistory: ["faith"] });
  assert.equal(loadCloudBaseline(storage, cloudOwnerTag("different-user")), null);
  assert.doesNotMatch([...values.values()].join(""), new RegExp(uid));
});

test("canonical cloud settings win while bounded histories merge", () => {
  const cloudEntry = { ...entry, id: "cloud-1", bibleLanguage: "en", book: "John" };
  const migrated = migrateCloudDocument({ awmpcBible: {
    settings: { ...settings, appearance: "day", primaryBibleLanguage: "ko", secondaryBibleLanguage: "en" },
    history: [cloudEntry], searchHistory: ["mercy"],
  } }, { settings: { ...settings, appearance: "night" }, history: [entry], searchHistory: ["faith"] });
  assert.equal(migrated.settings.appearance, "day");
  assert.deepEqual(migrated.history.map(({ id }) => id), ["cloud-1", "local-1"]);
  assert.deepEqual(migrated.searchHistory, ["mercy", "faith"]);
});

test("hydration preserves local interactions completed while cloud data was loading", () => {
  const initial = { settings, history: [entry], searchHistory: ["faith"] };
  const current = {
    settings: { ...settings, appearance: "night" },
    history: [{ ...entry, id: "new-verse", verse: "17" }, entry],
    searchHistory: ["grace", "faith"],
  };
  const cloudEntry = { ...entry, id: "cloud-verse", bibleLanguage: "en", book: "John" };
  const hydrated = {
    settings: { ...settings, textScale: "large", appearance: "day" },
    history: [cloudEntry, entry],
    searchHistory: ["mercy", "faith"],
  };
  const reconciled = reconcileConcurrentHydration(initial, current, hydrated);
  assert.equal(reconciled.settings.appearance, "night");
  assert.equal(reconciled.settings.textScale, "large");
  assert.deepEqual(reconciled.history.map(({ id }) => id), ["new-verse", "cloud-verse", "local-1"]);
  assert.deepEqual(reconciled.searchHistory, ["grace", "mercy", "faith"]);

  const removedDuringSave = reconcileConcurrentHydration(hydrated, { ...hydrated, history: [entry], searchHistory: ["faith"] }, hydrated);
  assert.deepEqual(removedDuringSave.history, [entry]);
  assert.deepEqual(removedDuringSave.searchHistory, ["faith"]);
});

test("search history normalizes, bounds, persists, and replaces", () => {
  assert.deepEqual(normalizeSearchHistory([" grace ", "GRACE", "x", 3, "hope"]), ["grace", "hope"]);
  const values = new Map();
  const store = new LocalSearchHistoryStore({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
  store.replace(["grace", "hope"]);
  assert.deepEqual(store.list(), ["grace", "hope"]);
});

test("cloud retries transient failures only and stops on abort", async () => {
  globalThis.window = { setTimeout, clearTimeout };
  let attempts = 0;
  const controller = new AbortController();
  const result = await withBackoff(async () => {
    attempts += 1;
    if (attempts === 1) throw { code: "unavailable" };
    return "ready";
  }, controller.signal, [1]);
  assert.equal(result, "ready");
  assert.equal(attempts, 2);
  assert.equal(isRetryableCloudError({ code: "permission-denied" }), false);
  await assert.rejects(withBackoff(async () => { throw { code: "permission-denied" }; }, controller.signal, [1]));
  const aborting = new AbortController();
  const started = performance.now();
  const pending = withBackoff(async () => { throw { code: "unavailable" }; }, aborting.signal, [100]);
  setTimeout(() => aborting.abort(), 2);
  await assert.rejects(pending);
  assert.ok(performance.now() - started < 80);
  const preAborted = new AbortController();
  preAborted.abort();
  let called = false;
  await assert.rejects(withBackoff(async () => { called = true; }, preAborted.signal, [1]));
  assert.equal(called, false);
  delete globalThis.window;
});
