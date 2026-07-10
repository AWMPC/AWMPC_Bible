import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isRetryableStatus, listBooks, parseLibrary, readChapter } from "../src/data/library.ts";

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
    readFile(new URL("../src/ui/FeatureSheet.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/features.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(reader.includes('className="topbar"'), false);
  assert.equal(reader.includes('className="library"'), false);
  assert.match(dock, /DOCK_FEATURES\.map/);
  assert.match(dock, /aria-haspopup="dialog"/);
  assert.match(sheet, /<dialog/);
  assert.match(sheet, /showModal\(\)/);
  assert.match(sheet, /aria-labelledby/);
  for (const feature of ["history", "search", "navigation", "profile"]) assert.match(features, new RegExp(feature));
});

test("OpenAI Sites packaging is absent", async () => {
  await assert.rejects(readFile(new URL("../build/sites-vite-plugin.ts", import.meta.url)));
  await assert.rejects(readFile(new URL("../.openai/hosting.json", import.meta.url)));
});
