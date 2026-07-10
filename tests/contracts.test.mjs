import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isRetryableStatus, listBooks, parseLibrary, readChapter } from "../src/data/library.ts";
import { createOverlayOrigin } from "../src/ui/features.ts";
import { LocalHistoryStore } from "../src/history/HistoryStore.ts";
import { LocalSettingsStore } from "../src/settings/SettingsStore.ts";
import { DEFAULT_TEXT_SCALE, TEXT_SCALES, textScaleAt } from "../src/settings/textScale.ts";
import { DEFAULT_VERSE_FONT, VERSE_FONTS, isVerseFont } from "../src/settings/verseFont.ts";
import { APPEARANCES, DEFAULT_APPEARANCE, isAppearance } from "../src/settings/appearance.ts";
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

test("AWMPC Bible uses a typed Vite worker and text-only React rendering", async () => {
  const source = await readFile(new URL("../src/AwmpcBibleApp.tsx", import.meta.url), "utf8");
  assert.match(source, /data\.worker\?worker/);
  assert.match(source, /worker\.terminate\(\)/);
  assert.equal(source.includes("dangerouslySetInnerHTML"), false);
  assert.equal(source.includes("innerHTML"), false);
});

test("AWMPC Bible has one resilient Liquid Glass presentation", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /@supports not/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
});

test("pointer interaction never introduces borders while keyboard focus remains visible", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /:focus:not\(:focus-visible\)/);
  assert.match(styles, /button:focus-visible/);
  assert.match(styles, /\.verses li:focus-visible/);
  const currentRule = styles.match(/\.choice-grid button\[aria-current="page"\]\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.equal(currentRule.includes("border"), false);
  const forcedColors = styles.match(/@media \(forced-colors: active\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";
  assert.equal(forcedColors.includes("outline: 2px solid Highlight"), false);
});

test("AWMPC Bible uses one scalable dock and native overlay host", async () => {
  const [appSource, dock, sheet, features] = await Promise.all([
    readFile(new URL("../src/AwmpcBibleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/FloatingDock.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/FeatureOverlay.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/features.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(appSource.includes('className="topbar"'), false);
  assert.equal(appSource.includes('className="library"'), false);
  assert.match(dock, /DOCK_FEATURES\.map/);
  assert.match(dock, /aria-haspopup="dialog"/);
  assert.match(sheet, /<dialog/);
  assert.match(sheet, /showModal\(\)/);
  assert.match(sheet, /overlayFrames/);
  assert.match(sheet, /reverse \? \[\.\.\.frames\]\.reverse\(\) : frames/);
  assert.match(sheet, /OVERLAY_ANIMATION_TIMING/);
  assert.doesNotMatch(sheet, /direction:/);
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

test("legacy history migrates to the AWMPC Bible namespace", async () => {
  const legacyEntry = { id: "legacy", book: "Example", chapter: "1", verse: "2", visitedAt: "2026-07-10T20:30:00.000Z" };
  const values = new Map([["quiet-reader.history.v1", JSON.stringify([legacyEntry])]]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(await new LocalHistoryStore(storage).list(), [legacyEntry]);
  assert.equal(values.has("awmpc-bible.history.v1"), true);
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
  store.save({ textScale: "large", verseFont: "system-sans", appearance: "night" });
  assert.deepEqual(store.load(), { textScale: "large", verseFont: "system-sans", appearance: "night" });
  values.set("awmpc-bible.settings.v1", '{"textScale":"unknown"}');
  assert.deepEqual(store.load(), { textScale: "standard", verseFont: "system-serif", appearance: "auto" });
  const unavailable = new LocalSettingsStore({ getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  assert.deepEqual(unavailable.load(), { textScale: "standard", verseFont: "system-serif", appearance: "auto" });
  assert.doesNotThrow(() => unavailable.save({ textScale: "compact", verseFont: "rounded", appearance: "day" }));
});

test("old settings preserve scale while font defaults independently", () => {
  const values = new Map([["quiet-reader.settings.v1", '{"textScale":"large"}']]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(new LocalSettingsStore(storage).load(), { textScale: "large", verseFont: "system-serif", appearance: "auto" });
  assert.equal(values.has("awmpc-bible.settings.v1"), true);
  assert.equal(VERSE_FONTS.length, 4);
  assert.equal(DEFAULT_VERSE_FONT, "system-serif");
  assert.equal(isVerseFont("monospace"), true);
  assert.equal(isVerseFont("remote-font"), false);
});

test("appearance exposes an exact validated Auto, Day, Night allowlist", () => {
  assert.deepEqual(APPEARANCES.map((option) => option.id), ["auto", "day", "night"]);
  assert.equal(DEFAULT_APPEARANCE, "auto");
  assert.equal(isAppearance("night"), true);
  assert.equal(isAppearance("custom"), false);
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

test("profile font selector uses only local system stacks for verses and numbers", async () => {
  const [profile, styles] = await Promise.all([
    readFile(new URL("../src/ui/ProfilePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(profile, /<label[^>]*htmlFor="verse-font"/);
  assert.match(profile, /<select[^>]*id="verse-font"/);
  assert.match(styles, /--verse-font-family/);
  assert.match(styles, /\.verses li > span[^}]*font-family:\s*var\(--verse-font-family\)/);
  assert.match(styles, /\.verses p[^}]*var\(--verse-font-family\)/);
  assert.doesNotMatch(styles, /@font-face|url\(/);
});

test("appearance selector uses CSS-native live system detection", async () => {
  const [profile, styles, appearanceSource] = await Promise.all([
    readFile(new URL("../src/ui/ProfilePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../src/settings/appearance.ts", import.meta.url), "utf8"),
  ]);
  assert.match(profile, /<label[^>]*htmlFor="appearance"/);
  assert.match(profile, /<select[^>]*id="appearance"/);
  assert.match(styles, /data-appearance="day"/);
  assert.match(styles, /data-appearance="night"/);
  assert.match(styles, /@media \(prefers-color-scheme: dark\)/);
  assert.match(styles, /data-appearance="auto"/);
  assert.doesNotMatch(appearanceSource, /matchMedia|addEventListener/);
});

test("navigation stays vertically ordered in one contained scroll view", async () => {
  const [appSource, styles] = await Promise.all([
    readFile(new URL("../src/AwmpcBibleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.ok(appSource.indexOf('id="books-title"') < appSource.indexOf('id="chapters-title"'));
  assert.ok(appSource.indexOf('id="chapters-title"') < appSource.indexOf('id="verses-title"'));
  assert.match(styles, /\.navigation-panel\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(styles, /\.overlay-content\s*\{[^}]*overscroll-behavior:\s*contain/);
  assert.doesNotMatch(styles, /\.navigation-panel section\s*\{[^}]*overflow-y:\s*auto/);
});

test("document scroll lock restores styles without issuing a scroll", () => {
  const bodyStyle = { overflow: "visible" };
  const rootStyle = { overflow: "clip", overscrollBehavior: "auto" };
  const priorDocument = globalThis.document;
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { style: rootStyle }, body: { style: bodyStyle } } });
  try {
    const release = lockDocumentScroll();
    assert.equal(bodyStyle.overflow, "hidden");
    assert.equal(rootStyle.overflow, "hidden");
    assert.equal(rootStyle.overscrollBehavior, "none");
    release();
    release();
    assert.equal(bodyStyle.overflow, "visible");
    assert.equal(rootStyle.overflow, "clip");
    assert.equal(rootStyle.overscrollBehavior, "auto");
  } finally {
    if (priorDocument === undefined) delete globalThis.document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: priorDocument });
  }
});

test("closing after verse selection never focuses or scrolls the background target", async () => {
  const appSource = await readFile(new URL("../src/AwmpcBibleApp.tsx", import.meta.url), "utf8");
  const lock = await readFile(new URL("../src/ui/scrollLock.ts", import.meta.url), "utf8");
  assert.doesNotMatch(appSource, /scrollIntoView|\.focus\(/);
  assert.match(appSource, /historyStoreRef/);
  assert.match(appSource, /overlayRef\.current\?\.close\(\)/);
  assert.doesNotMatch(lock, /scrollTo|scrollX|scrollY|position\s*=\s*"fixed"/);
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

test("a trusted tap anywhere in the verse view toggles dock visibility", async () => {
  const [appSource, hookSource] = await Promise.all([
    readFile(new URL("../src/AwmpcBibleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/useUserScrollDockVisibility.ts", import.meta.url), "utf8"),
  ]);
  assert.match(appSource, /className="reading-pane"[\s\S]*?event\.nativeEvent\.isTrusted && event\.detail > 0[\s\S]*?toggleDockVisibility\(\)/);
  assert.match(hookSource, /const toggle = useCallback/);
  assert.match(hookSource, /if \(!enabled\) return/);
  assert.match(hookSource, /visibleRef\.current = next/);
  assert.match(hookSource, /return \{ visible, toggle \}/);
});

test("verse view presents book and chapter once without redundant labels", async () => {
  const [appSource, styles] = await Promise.all([
    readFile(new URL("../src/AwmpcBibleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(appSource, /Now reading/);
  assert.match(appSource, /className="chapter-indicator">Chapter <strong>\{chapter\}<\/strong>/);
  assert.match(appSource, /<article aria-label=\{`\$\{book\} chapter \$\{chapter\}`\}>/);
  assert.doesNotMatch(appSource, /<article[^>]*><h2>Chapter/);
  assert.doesNotMatch(styles, /article h2/);
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

test("overlay closing matches the opening duration, easing, and reversed content timing", async () => {
  const source = await readFile(new URL("../src/ui/FeatureOverlay.tsx", import.meta.url), "utf8");
  assert.match(source, /duration: 360/);
  assert.match(source, /easing: "cubic-bezier\(\.2, \.8, \.2, 1\)"/);
  assert.match(source, /offset: 0\.42/);
  assert.match(source, /offset: 0\.58/);
  assert.equal(source.match(/OVERLAY_ANIMATION_TIMING\)/g)?.length, 2);
});

test("OpenAI Sites packaging is absent", async () => {
  await assert.rejects(readFile(new URL("../build/sites-vite-plugin.ts", import.meta.url)));
  await assert.rejects(readFile(new URL("../.openai/hosting.json", import.meta.url)));
});

test("current product identity converges on AWMPC Bible", async () => {
  const [manifest, page, readme] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);
  assert.equal(JSON.parse(manifest).name, "awmpc-bible");
  assert.match(page, /<title>AWMPC Bible<\/title>/);
  assert.match(readme, /^# AWMPC Bible/m);
  assert.doesNotMatch(`${page}\n${readme}`, /Quiet Reader|awmpc-reader/i);
});
