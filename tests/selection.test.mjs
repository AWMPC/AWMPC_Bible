import test from "node:test";
import assert from "node:assert/strict";
import { runVerseSelection } from "../src/selection/runVerseSelection.ts";

const currentPassage = { book: "Genesis", chapter: "1", verses: [{ number: "1", text: "Text" }] };

test("navigation prefetched selection records and reveals without loading", async () => {
  const events = [];
  const location = { book: "John", chapter: "3", verse: "16" };
  const prefetchedVerses = [{ number: "16", text: "Text" }];
  const selected = await runVerseSelection(location, { prefetchedVerses }, {
    currentPassage,
    loadChapter: async () => { throw new Error("must not load"); },
    isCurrent: () => true,
    recordHistory: (value) => events.push(["history", value]),
    reveal: async (passage, verse) => events.push(["reveal", passage, verse]),
  });
  assert.deepEqual(selected, { status: "selected" });
  assert.deepEqual(events, [["history", location], ["reveal", { book: "John", chapter: "3", verses: prefetchedVerses }, "16"]]);
});

test("history selection loads and reveals without duplicating history", async () => {
  const events = [];
  const verses = [{ number: "5", text: "Text" }];
  const selected = await runVerseSelection({ book: "Romans", chapter: "8", verse: "5" }, { recordHistory: false }, {
    currentPassage,
    loadChapter: async (book, chapter) => { events.push(["load", book, chapter]); return verses; },
    isCurrent: () => true,
    recordHistory: () => events.push("unexpected-history"),
    reveal: async (passage, verse) => events.push(["reveal", passage, verse]),
  });
  assert.deepEqual(selected, { status: "selected" });
  assert.deepEqual(events, [["load", "Romans", "8"], ["reveal", { book: "Romans", chapter: "8", verses }, "5"]]);
});

test("search selection records its localized result through the shared selection layer", async () => {
  const recorded = [];
  const localized = { bibleLanguage: "ko", book: "창세기", chapter: "1", verse: "1" };
  const selected = await runVerseSelection({ book: "Genesis", chapter: "1", verse: "1" }, { historySelection: localized }, {
    currentPassage,
    loadChapter: async () => { throw new Error("must not load"); },
    isCurrent: () => true,
    recordHistory: (value) => recorded.push(value),
    reveal: async () => {},
  });
  assert.deepEqual(selected, { status: "selected" });
  assert.deepEqual(recorded, [localized]);
});

test("stale, missing, and failed selection results never commit", async () => {
  let revealed = false;
  const dependencies = {
    currentPassage,
    loadChapter: async () => null,
    isCurrent: () => true,
    recordHistory: () => {},
    reveal: async () => { revealed = true; },
  };
  assert.deepEqual(await runVerseSelection({ book: "Missing", chapter: "1", verse: "1" }, {}, dependencies), { status: "ignored" });
  assert.deepEqual(await runVerseSelection({ book: "Genesis", chapter: "1", verse: "2" }, {}, { ...dependencies, loadChapter: async () => currentPassage.verses }), { status: "ignored" });
  assert.deepEqual(await runVerseSelection({ book: "Genesis", chapter: "1", verse: "1" }, {}, { ...dependencies, isCurrent: () => false }), { status: "ignored" });
  assert.equal(revealed, false);
});

test("selection failures are returned as typed results instead of rejecting", async () => {
  const loadError = new Error("load failed");
  const failedLoad = await runVerseSelection({ book: "John", chapter: "1", verse: "1" }, {}, {
    currentPassage,
    loadChapter: async () => { throw loadError; },
    isCurrent: () => true,
    recordHistory: () => {},
    reveal: async () => {},
  });
  assert.deepEqual(failedLoad, { status: "failed", error: loadError });

  const abort = new DOMException("cancelled", "AbortError");
  const cancelled = await runVerseSelection({ book: "Genesis", chapter: "1", verse: "1" }, {}, {
    currentPassage,
    loadChapter: async () => currentPassage.verses,
    isCurrent: () => true,
    recordHistory: () => {},
    reveal: async () => { throw abort; },
  });
  assert.deepEqual(cancelled, { status: "ignored" });
});
