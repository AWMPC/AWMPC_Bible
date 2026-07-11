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
  assert.equal(selected, true);
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
  assert.equal(selected, true);
  assert.deepEqual(events, [["load", "Romans", "8"], ["reveal", { book: "Romans", chapter: "8", verses }, "5"]]);
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
  assert.equal(await runVerseSelection({ book: "Missing", chapter: "1", verse: "1" }, {}, dependencies), false);
  assert.equal(await runVerseSelection({ book: "Genesis", chapter: "1", verse: "2" }, {}, { ...dependencies, loadChapter: async () => currentPassage.verses }), false);
  assert.equal(await runVerseSelection({ book: "Genesis", chapter: "1", verse: "1" }, {}, { ...dependencies, isCurrent: () => false }), false);
  assert.equal(revealed, false);
});
