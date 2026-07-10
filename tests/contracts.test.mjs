import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isRetryableStatus, listBooks, parseLibrary, readChapter } from "../src/data/library.ts";
import { createOverlayOrigin } from "../src/ui/features.ts";
import { LocalHistoryStore } from "../src/history/HistoryStore.ts";
import { LocalSettingsStore } from "../src/settings/SettingsStore.ts";
import { DEFAULT_TEXT_SCALE, TEXT_SCALES, textScaleAt } from "../src/settings/textScale.ts";
import { lockDocumentScroll } from "../src/ui/scrollLock.ts";
import { nextDockVisibility } from "../src/ui/useUserScrollDockVisibility.ts";

const fixture = JSON.stringify({ Example: { "1": { "1": "A generic test sentence.", "2": "Another sentence." }, "10": { "1": "Later." } } });

test("parses and navigates a valid nested library in numeric order", () => {
  const library = parseLibrary(fixture);
  assert.deepEqual(listBooks(library), [{ name: "Example", chapters: ["1", "10"] }]);
  assert.deepEqual(readChapter(library, "Example", "1"), [
    { number: "1", text: "A generic test sentence." },
    { number: "2", text: "Another sentence." },
  ]);
});

test("rejects malformed and prototype-sensitive data", () => {
  assert.throws(() => parseLibrary("[]"), /root/);
  assert.throws(() => parseLibrary('{"constructor":{"1":{"1":"unsafe"}}}'), /invalid key/);
  assert.throws(() => readChapter(parseLibrary(fixture), "Missing", "1"), /unavailable/);
});

test("retries only transient HTTP failures", () => {
  assert.equal(isRetryableStatus(408), true);
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(404), false);
});

test("reader uses a typed Vite worker and text-only React rendering", async () => {
  const source = await readFile(new URL("../src/Reader.tsx", import.meta.url), "utf8");
  assert.match(source, /data\.worker\?worker/);
  assert.match(source, /worker\.terminate\(\)/);
  assert.equal(source.includes("dangerouslySetInnerHTML"), false);
  assert.equal(source.includes("innerHTML"), false);
});

test("reader has one resilient Liquid Glass presentation", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /@supports not/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
});

test("reader uses one scalable dock and native overlay host", async () => {
  const [reader, dock, sheet, features] = await Promise.all([
    readFile(new URL("../src/Reader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/FloatingDock.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/FeatureOverlay.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/features.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(reader.includes('className="topbar"'), false);
  assert.equal(reader.includes('className="library"'), false);
  assert.match(dock, /DOCK_FEATURES\.map/);
  assert.match(dock, /aria-haspopup="dialog"/);
  assert.match(sheet, /<dialog/);
  assert.match(sheet, /showModal\(\)/);
  assert.match(sheet, /overlayFrames/);
  assert.match(sheet, /direction: reverse \? "reverse"/);
  assert.match(sheet, /onCancel/);
  assert.match(sheet, /aria-labelledby/);
  for (const feature of ["history", "search", "navigation", "profile"]) assert.match(features, new RegExp(feature));
});

test("history records every verse selection with a timestamp and stays bounded", async () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = new LocalHistoryStore(storage, 2, () => new Date("2026-07-10T20:30:00.000Z"), () => `entry-${values.size}`);
  await store.add({ book: "Example", chapter: "1", verse: "1" });
  await store.add({ book: "Example", chapter: "1", verse: "2" });
  await store.add({ book: "Example", chapter: "1", verse: "3" });
  const entries = await store.list();
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0], { id: "entry-1", book: "Example", chapter: "1", verse: "3", visitedAt: "2026-07-10T20:30:00.000Z" });
  assert.equal("text" in entries[0], false);
});

test("history recovers from malformed or unavailable storage", async () => {
  const malformed = new LocalHistoryStore({ getItem: () => "not json", setItem: () => {} });
  assert.deepEqual(await malformed.list(), []);
  const unavailable = new LocalHistoryStore({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, 2, () => new Date(0), () => "safe-id");
  assert.deepEqual(await unavailable.add({ book: "Example", chapter: "1", verse: "1" }), { id: "safe-id", book: "Example", chapter: "1", verse: "1", visitedAt: "1970-01-01T00:00:00.000Z" });
});

test("text scale exposes five exact snap points", () => {
  assert.equal(TEXT_SCALES.length, 5);
  assert.equal(textScaleAt(-10), "compact");
  assert.equal(textScaleAt(1.6), "comfortable");
  assert.equal(textScaleAt(99), "extra-large");
  assert.equal(DEFAULT_TEXT_SCALE, "standard");
});

test("settings round-trip validated text scale and recover safely", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = new LocalSettingsStore(storage);
  store.save({ textScale: "large" });
  assert.deepEqual(store.load(), { textScale: "large" });
  values.set("quiet-reader.settings.v1", '{"textScale":"unknown"}');
  assert.deepEqual(store.load(), { textScale: "standard" });
  const unavailable = new LocalSettingsStore({ getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  assert.deepEqual(unavailable.load(), { textScale: "standard" });
  assert.doesNotThrow(() => unavailable.save({ textScale: "compact" }));
});

test("profile slider snaps and scales verse text and numbers", async () => {
  const [profile, styles] = await Promise.all([
    readFile(new URL("../src/ui/ProfilePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(profile, /type="range"/);
  assert.match(profile, /step="1"/);
  assert.match(profile, /aria-valuetext/);
  assert.match(styles, /--verse-text-size/);
  assert.match(styles, /--verse-number-size/);
  assert.match(styles, /data-text-scale="extra-large"/);
});

test("navigation stays vertically ordered in one contained scroll view", async () => {
  const [reader, styles] = await Promise.all([
    readFile(new URL("../src/Reader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.ok(reader.indexOf('id="books-title"') < reader.indexOf('id="chapters-title"'));
  assert.ok(reader.indexOf('id="chapters-title"') < reader.indexOf('id="verses-title"'));
  assert.match(styles, /\.navigation-panel\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(styles, /\.overlay-content\s*\{[^}]*overscroll-behavior:\s*contain/);
  assert.doesNotMatch(styles, /\.navigation-panel section\s*\{[^}]*overflow-y:\s*auto/);
});

test("document scroll lock restores exact prior styles and position", () => {
  const bodyStyle = { position: "", top: "", left: "", width: "", overflow: "", paddingRight: "" };
  const rootStyle = { overscrollBehavior: "auto" };
  const scrollCalls = [];
  const priorDocument = globalThis.document;
  const priorWindow = globalThis.window;
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { style: rootStyle, clientWidth: 980 }, body: { style: bodyStyle } } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { scrollX: 12, scrollY: 345, innerWidth: 1000, scrollTo: (...args) => scrollCalls.push(args) } });
  try {
    const release = lockDocumentScroll();
    assert.equal(bodyStyle.position, "fixed");
    assert.equal(bodyStyle.top, "-345px");
    assert.equal(rootStyle.overscrollBehavior, "none");
    release();
    release();
    assert.equal(bodyStyle.position, "");
    assert.equal(rootStyle.overscrollBehavior, "auto");
    assert.deepEqual(scrollCalls, [[12, 345]]);
  } finally {
    if (priorDocument === undefined) delete globalThis.document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: priorDocument });
    if (priorWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", { configurable: true, value: priorWindow });
  }
});

test("dock visibility changes only for fresh matching user scroll intent", () => {
  const down = { direction: 1, recordedAt: 1000 };
  const up = { direction: -1, recordedAt: 1000 };
  assert.equal(nextDockVisibility(true, 100, 180, null, 1100), true, "programmatic scroll is ignored");
  assert.equal(nextDockVisibility(true, 100, 180, down, 1100), false, "user scroll down hides");
  assert.equal(nextDockVisibility(false, 180, 90, up, 1100), true, "user scroll up reveals");
  assert.equal(nextDockVisibility(false, 180, 90, up, 1800), false, "stale intent is ignored");
  assert.equal(nextDockVisibility(false, 20, 0, up, 1100), true, "user scroll to top reveals");
  assert.equal(nextDockVisibility(true, 100, 180, up, 1100), true, "mismatched intent is ignored");
});

test("dock intent hook requires trusted user input and cleans up listeners", async () => {
  const source = await readFile(new URL("../src/ui/useUserScrollDockVisibility.ts", import.meta.url), "utf8");
  assert.match(source, /event\.isTrusted/);
  assert.match(source, /wheel/);
  assert.match(source, /touchmove/);
  assert.match(source, /keydown/);
  assert.match(source, /removeEventListener/);
  assert.doesNotMatch(source, /setTimeout/);
});

test("overlay geometry starts at its trigger and stops above the dock", () => {
  assert.deepEqual(
    createOverlayOrigin(
      { x: 640, y: 720, width: 72, height: 52 },
      { x: 600, y: 708, width: 360, height: 60 },
    ),
    { x: 640, y: 720, width: 72, height: 52, availableHeight: 700 },
  );
});

test("OpenAI Sites packaging is absent", async () => {
  await assert.rejects(readFile(new URL("../build/sites-vite-plugin.ts", import.meta.url)));
  await assert.rejects(readFile(new URL("../.openai/hosting.json", import.meta.url)));
});
