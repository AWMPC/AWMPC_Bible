import test from "node:test";
import assert from "node:assert/strict";
import { createOverlayOrigin } from "../src/ui/features.ts";
import { groupBooksByTestament } from "../src/ui/testaments.ts";
import { lockDocumentScroll } from "../src/ui/scrollLock.ts";
import { isTrustedReadingTap, nextDockVisibility } from "../src/ui/useUserScrollDockVisibility.ts";
import { completeStagedNavigation, stagedNavigationFrom } from "../src/navigation/useStagedNavigation.ts";
import { transitionVerseView, verseElementId } from "../src/ui/transitionVerseView.ts";
import { textScaleAt, TEXT_SCALES } from "../src/settings/textScale.ts";
import { APPEARANCES, isAppearance } from "../src/settings/appearance.ts";
import { VERSE_FONTS, isVerseFont } from "../src/settings/verseFont.ts";
import { scrollNavigationSection } from "../src/ui/navigationScroll.ts";

test("testament grouping preserves order and unknown books", () => {
  const books = ["Genesis", "Malachi", "Matthew", "Revelation", "Future Book"].map((name) => ({ name, chapters: ["1"] }));
  const grouped = groupBooksByTestament(books);
  assert.deepEqual(grouped.old.map((item) => item.name), ["Genesis", "Malachi"]);
  assert.deepEqual(grouped.new.map((item) => item.name), ["Matthew", "Revelation"]);
  assert.deepEqual(grouped.other.map((item) => item.name), ["Future Book"]);
});

test("settings allowlists and scale snapping remain exact", () => {
  assert.equal(TEXT_SCALES.length, 5);
  assert.equal(textScaleAt(-1), "compact");
  assert.equal(textScaleAt(99), "extra-large");
  assert.deepEqual(APPEARANCES.map(({ id }) => id), ["auto", "day", "night"]);
  assert.equal(isAppearance("custom"), false);
  assert.equal(VERSE_FONTS.length, 4);
  assert.equal(isVerseFont("remote-font"), false);
});

test("overlay origin stops above the dock", () => {
  assert.deepEqual(createOverlayOrigin({ x: 640, y: 720, width: 72, height: 52 }, { x: 600, y: 708, width: 360, height: 60 }), { x: 640, y: 720, width: 72, height: 52, availableHeight: 700 });
});

test("navigation progression scrolls only its overlay container and respects reduced motion", () => {
  const calls = [];
  const container = { scrollTo: (options) => calls.push(options) };
  const target = { offsetTop: 780, getBoundingClientRect: () => ({ top: -400 }) };
  scrollNavigationSection(container, target, false);
  scrollNavigationSection(container, target, true);
  assert.deepEqual(calls, [
    { top: 780, behavior: "smooth" },
    { top: 780, behavior: "auto" },
  ]);
});

test("scroll lock restores prior styles idempotently", () => {
  const bodyStyle = { overflow: "visible" };
  const rootStyle = { overflow: "clip", overscrollBehavior: "auto" };
  const prior = globalThis.document;
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { style: rootStyle }, body: { style: bodyStyle } } });
  try {
    const release = lockDocumentScroll();
    assert.equal(rootStyle.overflow, "hidden");
    release();
    release();
    assert.deepEqual(rootStyle, { overflow: "clip", overscrollBehavior: "auto" });
  } finally {
    if (prior === undefined) delete globalThis.document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: prior });
  }
});

test("dock responds only to fresh matching user intent", () => {
  const down = { direction: 1, recordedAt: 1000 };
  const up = { direction: -1, recordedAt: 1000 };
  assert.equal(nextDockVisibility(true, 100, 180, null, 1100), true);
  assert.equal(nextDockVisibility(true, 100, 180, down, 1100), false);
  assert.equal(nextDockVisibility(false, 180, 90, up, 1100), true);
  assert.equal(nextDockVisibility(false, 180, 90, up, 1800), false);
});

test("reading taps exclude untrusted, keyboard, and interactive activation", () => {
  assert.equal(isTrustedReadingTap(true, 1, false), true);
  assert.equal(isTrustedReadingTap(false, 1, false), false);
  assert.equal(isTrustedReadingTap(true, 0, false), false);
  assert.equal(isTrustedReadingTap(true, 1, true), false);
});

test("staged navigation derives from committed passage and handles loading results", () => {
  const passage = { book: "John", chapter: "3", verses: [{ number: "16", text: "Text" }] };
  const staged = stagedNavigationFrom(passage);
  assert.deepEqual(staged, { ...passage, status: "ready", error: "" });
  assert.deepEqual(completeStagedNavigation({ ...staged, status: "loading" }, null), { book: "John", chapter: "3", verses: [], status: "error", error: "That chapter could not be loaded." });
});

test("verse reveal performs the ordered fade and centered scroll", async () => {
  const events = [];
  const animations = [];
  const pane = { style: { opacity: "", removeProperty: () => events.push("restore") }, animate: (frames) => { animations.push(frames); return { finished: Promise.resolve(), cancel: () => {} }; } };
  const target = { scrollIntoView: (options) => events.push(["target", options]) };
  await transitionVerseView(pane, verseElementId("3", "16"), () => events.push("commit"), async () => { events.push("close"); }, {
    prefersReducedMotion: () => false,
    afterPaint: async () => events.push("paint"),
    scrollToTop: () => events.push("top"),
    findTarget: () => target,
  });
  assert.deepEqual(events, ["commit", "close", "paint", "top", ["target", { behavior: "smooth", block: "center", inline: "nearest" }], "restore"]);
  assert.deepEqual(animations, [[{ opacity: 1 }, { opacity: 0 }], [{ opacity: 0 }, { opacity: 1 }]]);
});

test("verse reveal cancellation after overlay close prevents late paint and scroll", async () => {
  const events = [];
  const controller = new AbortController();
  let releaseClose;
  const closeFinished = new Promise((resolve) => { releaseClose = resolve; });
  const pane = { style: { opacity: "", removeProperty: () => events.push("restore") } };
  const transition = transitionVerseView(
    pane,
    verseElementId("3", "16"),
    () => events.push("commit"),
    async () => { events.push("close"); await closeFinished; },
    {
      prefersReducedMotion: () => true,
      afterPaint: async () => events.push("paint"),
      scrollToTop: () => events.push("top"),
      findTarget: () => ({ scrollIntoView: () => events.push("target") }),
    },
    controller.signal,
  );

  await Promise.resolve();
  controller.abort();
  releaseClose();
  await assert.rejects(transition, { name: "AbortError" });
  assert.deepEqual(events, ["commit", "close", "restore"]);
});
