import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dataset has the expected safe nested string shape", async () => {
  const data = JSON.parse(await readFile(new URL("../public/data/bible-en.json", import.meta.url), "utf8"));
  assert.ok(Object.keys(data).length > 0);
  for (const chapters of Object.values(data)) {
    assert.equal(Array.isArray(chapters), false);
    for (const verses of Object.values(chapters)) {
      assert.equal(Array.isArray(verses), false);
      for (const text of Object.values(verses)) assert.equal(typeof text, "string");
    }
  }
});

test("worker never injects dataset text as HTML", async () => {
  const source = await readFile(new URL("../app/reader/Reader.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("dangerouslySetInnerHTML"), false);
  assert.equal(source.includes("innerHTML"), false);
});

test("reader has one resilient Liquid Glass presentation", async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL("../app/reader/Reader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const source = `${component}\n${styles}`.toLowerCase();
  for (const removedPath of ["material", "expressive", "theme-switcher", "data-theme", "reader-theme"]) {
    assert.equal(source.includes(removedPath), false, `unexpected theme path: ${removedPath}`);
  }
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /@supports not/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
});

test("worker enforces resource limits and retry backoff", async () => {
  const source = await readFile(new URL("../public/data.worker.js", import.meta.url), "utf8");
  assert.match(source, /LIMITS\s*=/);
  assert.match(source, /attempt < 4/);
  assert.match(source, /response.status === 429/);
  assert.match(source, /credentials: "same-origin"/);
});
