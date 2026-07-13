import test from "node:test";
import assert from "node:assert/strict";
import { parseLibrary } from "../src/data/library.ts";
import { buildSearchIndex, hyphenSearchAliases, normalizeSearchText, searchDocuments, SEARCH_LIMITS } from "../src/search/searchIndex.ts";

const library = parseLibrary(JSON.stringify({
  Genesis: { "1": {
    "1": "In the beginning God created the heavens and the earth.",
    "2": "The earth was formless and empty. {A hidden explanatory Bar-Jesus note}",
    "3": "Light appeared over the waters.",
  } },
  "창세기": { "1": {
    "1": "태초에 하나님이 천지를 창조하시니라",
    "2": "한국어 시험 구절 본문입니다",
  } },
  Acts: { "13": { "6": "They met a Jewish sorcerer and false prophet named Bar-Jesus." } },
}));
const index = buildSearchIndex(library);

test("search normalization is Unicode-aware for English and Korean", () => {
  assert.equal(normalizeSearchText(" ＢＥＧＩＮＮＩＮＧ—God! "), "beginning god");
  assert.equal(normalizeSearchText("한국어, 구절."), "한국어 구절");
  assert.deepEqual(hyphenSearchAliases("Bar-Jesus well‐known non‑breaking"), ["barjesus", "wellknown", "nonbreaking"]);
  assert.deepEqual(hyphenSearchAliases("Bar Jesus; Bar / Jesus; Bar- Jesus; O’Malley"), []);
});

test("search ranks exact phrases and accepts bounded fuzzy spelling", () => {
  assert.equal(searchDocuments(index, "beginning God")[0]?.verse, "1");
  assert.equal(searchDocuments(index, "begnning")[0]?.verse, "1");
  assert.equal(searchDocuments(index, "구졀")[0]?.book, "창세기");
  assert.deepEqual(searchDocuments(index, "beginning waters"), []);
  assert.equal(searchDocuments(index, "earth")[0]?.verse, "1");
  const barJesus = searchDocuments(index, "barjesus");
  assert.deepEqual(barJesus.map(({ book, chapter, verse }) => [book, chapter, verse]), [["Acts", "13", "6"]]);
  assert.equal(barJesus[0]?.text.includes("Bar-Jesus"), true);
  assert.deepEqual(searchDocuments(index, "barjesus extra"), []);
});

test("search excludes footnote bodies and bounds queries, excerpts, and results", () => {
  assert.deepEqual(searchDocuments(index, "explanatory"), []);
  assert.deepEqual(searchDocuments(index, "x"), []);
  assert.ok(searchDocuments(index, "beginning", 999).length <= SEARCH_LIMITS.results);
  assert.ok(searchDocuments(index, `${"z".repeat(200)} beginning`).length <= SEARCH_LIMITS.results);
  assert.ok(searchDocuments(index, "earth").every(({ text }) => Array.from(text).length <= SEARCH_LIMITS.excerptCodePoints));
});

test("search ties remain in canonical dataset order", () => {
  const repeated = buildSearchIndex(parseLibrary(JSON.stringify({ Example: { "1": { "1": "Shared phrase", "2": "Shared phrase", "3": "Shared phrase" } } })));
  assert.deepEqual(searchDocuments(repeated, "shared phrase", 2).map(({ verse }) => verse), ["1", "2"]);
});
