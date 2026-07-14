import test from "node:test";
import assert from "node:assert/strict";
import { createOverlayOrigin } from "../src/ui/features.ts";
import { groupBooksByTestament } from "../src/ui/testaments.ts";
import { lockDocumentScroll } from "../src/ui/scrollLock.ts";
import { isTrustedReadingTap, nextDockVisibility } from "../src/ui/useUserScrollChromeVisibility.ts";
import { completeStagedNavigation, stagedNavigationFrom } from "../src/navigation/useStagedNavigation.ts";
import { transitionChapterView, transitionVerseView, verseElementId } from "../src/ui/transitionVerseView.ts";
import { textScaleAt, TEXT_SCALES } from "../src/settings/textScale.ts";
import { APPEARANCES, isAppearance } from "../src/settings/appearance.ts";
import { VERSE_FONTS, isVerseFont, normalizeVerseFont } from "../src/settings/verseFont.ts";
import { scrollNavigationSection } from "../src/ui/navigationScroll.ts";
import { BIBLE_LANGUAGE_OPTIONS, isBibleLanguage } from "../src/settings/bibleLanguage.ts";
import { chapterScrollProgress } from "../src/ui/useChapterScrollProgress.ts";
import { middleVerseFromRects, nearestNumericValue } from "../src/ui/middleVerse.ts";
import { createVerseLink, formatVerseForCopy, parseVerseLink } from "../src/links/verseLinks.ts";
import { pairedBookName, versesByNumber } from "../src/data/dualLanguage.ts";
import { adjacentChapter } from "../src/navigation/adjacentChapter.ts";
import { horizontalSwipeDirection, horizontalWheelDirection, wheelSequenceHasEnded } from "../src/ui/useChapterSwipe.ts";
import { overflowMarqueeMetrics } from "../src/ui/marqueeMetrics.ts";

test("chapter scroll progress is exact through the chapter's scrollable range", () => {
  const base = { viewportHeight: 800, chapterTop: 100, chapterHeight: 2800 };
  assert.equal(chapterScrollProgress({ ...base, viewportTop: 100 }), 0);
  assert.equal(chapterScrollProgress({ ...base, viewportTop: 1100 }), 0.5);
  assert.equal(chapterScrollProgress({ ...base, viewportTop: 2100 }), 1);
});

test("chapter scroll progress clamps and safely rejects unusable geometry", () => {
  const base = { viewportHeight: 800, chapterTop: 100, chapterHeight: 2800 };
  assert.equal(chapterScrollProgress({ ...base, viewportTop: -500 }), 0);
  assert.equal(chapterScrollProgress({ ...base, viewportTop: 5000 }), 1);
  assert.equal(chapterScrollProgress({ ...base, chapterHeight: 800, viewportTop: 100 }), 0);
  assert.equal(chapterScrollProgress({ ...base, chapterHeight: 400, viewportTop: 100 }), 0);
  assert.equal(chapterScrollProgress({ ...base, viewportTop: Number.NaN }), 0);
  assert.equal(chapterScrollProgress({ ...base, viewportHeight: 0 }), 0);
});

test("adjacent chapter navigation crosses book boundaries without escaping the library", () => {
  const books = [
    { name: "Genesis", chapters: ["1", "2"] },
    { name: "Empty", chapters: [] },
    { name: "Matthew", chapters: ["1", "2", "3"] },
  ];
  assert.deepEqual(adjacentChapter(books, { book: "Genesis", chapter: "1" }, 1), { book: "Genesis", chapter: "2" });
  assert.deepEqual(adjacentChapter(books, { book: "Genesis", chapter: "2" }, 1), { book: "Matthew", chapter: "1" });
  assert.deepEqual(adjacentChapter(books, { book: "Matthew", chapter: "1" }, -1), { book: "Genesis", chapter: "2" });
  assert.equal(adjacentChapter(books, { book: "Genesis", chapter: "1" }, -1), null);
  assert.equal(adjacentChapter(books, { book: "Matthew", chapter: "3" }, 1), null);
  assert.equal(adjacentChapter(books, { book: "Missing", chapter: "1" }, 1), null);
  assert.equal(adjacentChapter(books, { book: "Genesis", chapter: "9" }, 1), null);
});

test("chapter gestures require a deliberate, horizontally dominant user motion", () => {
  assert.equal(horizontalSwipeDirection({ x: 180, y: 100 }, { x: 100, y: 104 }, 300), 1);
  assert.equal(horizontalSwipeDirection({ x: 100, y: 100 }, { x: 180, y: 96 }, 300), -1);
  assert.equal(horizontalSwipeDirection({ x: 180, y: 100 }, { x: 150, y: 100 }, 100), null);
  assert.equal(horizontalSwipeDirection({ x: 180, y: 100 }, { x: 100, y: 180 }, 100), null);
  assert.equal(horizontalSwipeDirection({ x: 180, y: 100 }, { x: 100, y: 100 }, 901), null);
  assert.equal(horizontalWheelDirection(80, 4), 1);
  assert.equal(horizontalWheelDirection(-80, 4), -1);
  assert.equal(horizontalWheelDirection(80, 70), null);
  assert.equal(horizontalWheelDirection(Number.NaN, 0), null);
});

test("a new trackpad gesture synchronously releases an overdue wheel lock", () => {
  assert.equal(wheelSequenceHasEnded(100, 279), false);
  assert.equal(wheelSequenceHasEnded(100, 280), true);
  assert.equal(wheelSequenceHasEnded(100, 500), true);
  assert.equal(wheelSequenceHasEnded(0, 500), false);
  assert.equal(wheelSequenceHasEnded(Number.NaN, 500), false);
});

test("testament grouping preserves order and unknown books", () => {
  const books = ["Genesis", "Malachi", "Matthew", "Revelation", "Future Book"].map((name) => ({ name, chapters: ["1"] }));
  const grouped = groupBooksByTestament(books);
  assert.deepEqual(grouped.old.map((item) => item.name), ["Genesis", "Malachi"]);
  assert.deepEqual(grouped.new.map((item) => item.name), ["Matthew", "Revelation"]);
  assert.deepEqual(grouped.other.map((item) => item.name), ["Future Book"]);
});

test("testament grouping recognizes Korean book names", () => {
  const books = ["창세기", "말라기", "마태복음", "요한계시록"].map((name) => ({ name, chapters: ["1"] }));
  const grouped = groupBooksByTestament(books);
  assert.deepEqual(grouped.old.map((item) => item.name), ["창세기", "말라기"]);
  assert.deepEqual(grouped.new.map((item) => item.name), ["마태복음", "요한계시록"]);
  assert.deepEqual(grouped.other, []);
});

test("dual-language books and verses pair by stable identity", () => {
  const english = ["Genesis", "Matthew"].map((name) => ({ name, chapters: ["1"] }));
  const korean = ["창세기", "마태복음"].map((name) => ({ name, chapters: ["1"] }));
  assert.equal(pairedBookName("Matthew", english, korean), "마태복음");
  assert.equal(pairedBookName("Missing", english, korean), null);
  assert.equal(pairedBookName("Matthew", english, korean.slice(0, 1)), null);
  const pairedVerses = versesByNumber([{ number: "2", text: "Two" }, { number: "4", text: "Four" }]);
  assert.equal(pairedVerses.get("4")?.text, "Four");
  assert.equal(pairedVerses.has("3"), false);
});

test("settings allowlists and scale snapping remain exact", () => {
  assert.equal(TEXT_SCALES.length, 5);
  assert.equal(textScaleAt(-1), "compact");
  assert.equal(textScaleAt(99), "extra-large");
  assert.deepEqual(APPEARANCES.map(({ id }) => id), ["auto", "day", "night"]);
  assert.equal(isAppearance("custom"), false);
  assert.deepEqual(VERSE_FONTS.map(({ id, label }) => [id, label]), [
    ["system-sans", "Sans"],
    ["system-serif", "Serif"],
    ["monospace", "Mono"],
  ]);
  assert.equal(isVerseFont("rounded"), false);
  assert.equal(normalizeVerseFont("rounded"), "system-sans");
  assert.equal(isVerseFont("remote-font"), false);
  assert.deepEqual(BIBLE_LANGUAGE_OPTIONS.map(({ id }) => id), ["en", "ko"]);
  assert.equal(isBibleLanguage("ko"), true);
  assert.equal(isBibleLanguage("jp"), false);
});

test("overlay origin stops above the dock", () => {
  assert.deepEqual(createOverlayOrigin({ x: 640, y: 720, width: 72, height: 52 }, { x: 600, y: 708, width: 360, height: 60 }), { x: 640, y: 720, width: 72, height: 52, availableHeight: 700 });
});

test("overflow marquee activates only for measured overflow with bounded timing", () => {
  assert.deepEqual(overflowMarqueeMetrics(120, 120.9), { distance: 0, duration: 6, overflowing: false });
  assert.deepEqual(overflowMarqueeMetrics(120, 122), { distance: 2, duration: 6, overflowing: true });
  assert.deepEqual(overflowMarqueeMetrics(100, 250), { distance: 150, duration: 14, overflowing: true });
  assert.deepEqual(overflowMarqueeMetrics(100, 10_000), { distance: 9900, duration: 18, overflowing: true });
  assert.deepEqual(overflowMarqueeMetrics(Number.NaN, 200), { distance: 0, duration: 6, overflowing: false });
});

test("navigation progression scrolls only its overlay container and respects reduced motion", () => {
  const calls = [];
  const container = { scrollTop: 300, clientHeight: 600, scrollHeight: 2000, getBoundingClientRect: () => ({ top: 100 }), scrollTo: (options) => calls.push(options) };
  const section = { offsetTop: 500, offsetParent: container };
  const target = { offsetTop: 280, offsetHeight: 40, offsetParent: section, getBoundingClientRect: () => ({ top: 580 }) };
  scrollNavigationSection(container, target, false);
  scrollNavigationSection(container, target, true, "center");
  assert.deepEqual(calls, [
    { top: 780, behavior: "smooth" },
    { top: 500, behavior: "auto" },
  ]);
});

test("middle verse targeting is exact and deterministic across gaps", () => {
  const verses = [
    { number: "4", top: 100, bottom: 180 },
    { number: "5", top: 200, bottom: 280 },
  ];
  assert.equal(middleVerseFromRects(verses, 240), "5");
  assert.equal(middleVerseFromRects(verses, 190), "4");
  assert.equal(middleVerseFromRects([], 200), null);
  assert.equal(nearestNumericValue(["1", "5", "9"], "7"), "5");
});

test("verse links are bounded, deployable references with plain copy text", () => {
  const location = { bibleLanguage: "ko", book: "창세기", chapter: "1", verse: "16" };
  const link = createVerseLink(location, "https://reader.example/apps/bible/index.html?private=value#old");
  assert.equal(link, "https://reader.example/apps/bible/index.html?lang=ko&book=%EC%B0%BD%EC%84%B8%EA%B8%B0&chapter=1&verse=16");
  assert.deepEqual(parseVerseLink(link), location);
  assert.equal(parseVerseLink("https://reader.example/?lang=en&book=Genesis&chapter=01&verse=1"), null);
  assert.equal(parseVerseLink("not a URL"), null);
  assert.equal(formatVerseForCopy({ book: "Genesis", chapter: "1", verse: "1", text: "In the beginning" }), "In the beginning\n— Genesis 1:1");
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

test("chapter reveal fades, commits, and returns the reader to the top", async () => {
  const events = [];
  const animations = [];
  const pane = { style: { opacity: "", removeProperty: () => events.push("restore") }, animate: (frames) => { animations.push(frames); return { finished: Promise.resolve(), cancel: () => {} }; } };
  await transitionChapterView(pane, () => events.push("commit"), {
    prefersReducedMotion: () => false,
    afterPaint: async () => events.push("paint"),
    scrollToTop: () => events.push("top"),
    findTarget: () => null,
  });
  assert.deepEqual(events, ["commit", "paint", "top", "restore"]);
  assert.deepEqual(animations, [[{ opacity: 1 }, { opacity: 0 }], [{ opacity: 0 }, { opacity: 1 }]]);
});

test("chapter reveal cancellation before commit leaves the current chapter untouched", async () => {
  const events = [];
  const controller = new AbortController();
  controller.abort();
  const pane = { style: { opacity: "", removeProperty: () => events.push("restore") } };
  await assert.rejects(transitionChapterView(pane, () => events.push("commit"), {
    prefersReducedMotion: () => true,
    afterPaint: async () => events.push("paint"),
    scrollToTop: () => events.push("top"),
    findTarget: () => null,
  }, controller.signal), { name: "AbortError" });
  assert.deepEqual(events, ["restore"]);
});
