import test from "node:test";
import assert from "node:assert/strict";
import { fetchDatasetText, waitForDatasetRetry } from "../src/data/fetchDataset.ts";
import { LIMITS, parseInlineFootnotes, parseLibrary, readChapter } from "../src/data/library.ts";
import { dispatchChapterRequest } from "../src/data/chapterRequests.ts";
import { bibleDatasetUrl, isAllowedBibleDatasetUrl, isBibleLanguage } from "../src/data/languages.ts";

const noWait = async () => {};

test("maps only supported languages to local dataset files", () => {
  const base = "https://reader.example/apps/awmpc/";
  assert.equal(bibleDatasetUrl("en", base), `${base}data/bible-en.json`);
  assert.equal(bibleDatasetUrl("ko", base), `${base}data/bible-ko.json`);
  assert.equal(isBibleLanguage("en"), true);
  assert.equal(isBibleLanguage("ko"), true);
  assert.equal(isBibleLanguage("../private"), false);
});

test("allows only the exact same-origin language dataset below the deployed base", () => {
  const origin = "https://reader.example";
  const base = `${origin}/apps/awmpc/`;
  assert.equal(isAllowedBibleDatasetUrl("ko", `${base}data/bible-ko.json`, base, origin), true);
  assert.equal(isAllowedBibleDatasetUrl("ko", `${base}data/bible-en.json`, base, origin), false);
  assert.equal(isAllowedBibleDatasetUrl("ko", `${origin}/data/bible-ko.json`, base, origin), false);
  assert.equal(isAllowedBibleDatasetUrl("ko", "https://other.example/data/bible-ko.json", base, origin), false);
  assert.equal(isAllowedBibleDatasetUrl("ko", `https://user@reader.example/apps/awmpc/data/bible-ko.json`, base, origin), false);
});

test("external cancellation stops a dataset request without retrying", async () => {
  const controller = new AbortController();
  let calls = 0;
  const fetcher = (_url, init) => {
    calls += 1;
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
  };
  const request = fetchDatasetText("/data/bible-en.json", { fetcher, signal: controller.signal, wait: noWait });
  controller.abort(new DOMException("Language changed", "AbortError"));
  await assert.rejects(request, /Language changed/);
  assert.equal(calls, 1);
});

test("chapter requests settle when the worker is unavailable or not ready", async () => {
  const pending = new Map();
  assert.equal(await dispatchChapterRequest(null, true, pending, 1, "selection", "Genesis", "1"), null);
  assert.equal(await dispatchChapterRequest({ postMessage() { throw new Error("must not send"); } }, false, pending, 2, "selection", "Genesis", "1"), null);
  assert.equal(pending.size, 0);
});

test("chapter requests clean up and settle when posting fails", async () => {
  const pending = new Map();
  const worker = { postMessage() { throw new Error("worker stopped"); } };
  assert.equal(await dispatchChapterRequest(worker, true, pending, 3, "navigation", "Genesis", "1"), null);
  assert.equal(pending.size, 0);
});

test("chapter requests remain pending only after a successful dispatch", async () => {
  const pending = new Map();
  const messages = [];
  const result = dispatchChapterRequest({ postMessage(message) { messages.push(message); } }, true, pending, 4, "reader", "Genesis", "1");
  assert.deepEqual(messages, [{ type: "chapter", requestId: 4, target: "reader", book: "Genesis", chapter: "1" }]);
  assert.equal(pending.size, 1);
  pending.get(4).resolve([{ number: "1", text: "In the beginning" }]);
  assert.deepEqual(await result, [{ number: "1", text: "In the beginning" }]);
  assert.equal(pending.size, 0);
});

test("chapter requests time out, clean up, and ignore late responses", async () => {
  const pending = new Map();
  const result = dispatchChapterRequest({ postMessage() {} }, true, pending, 5, "reader", "Genesis", "1", 1);
  const lateResolve = pending.get(5).resolve;
  assert.equal(await result, null);
  assert.equal(pending.size, 0);
  lateResolve([{ number: "1", text: "Too late" }]);
  assert.equal(pending.size, 0);
});

test("cancelling a chapter request settles it and clears its timeout", async () => {
  const pending = new Map();
  const result = dispatchChapterRequest({ postMessage() {} }, true, pending, 6, "selection", "Genesis", "1", 60_000);
  pending.get(6).resolve(null);
  assert.equal(await result, null);
  assert.equal(pending.size, 0);
});

test("dataset retry wait removes its abort listener after resolving", async () => {
  const listeners = new Set();
  const signal = {
    aborted: false,
    reason: undefined,
    addEventListener(_type, listener) { listeners.add(listener); },
    removeEventListener(_type, listener) { listeners.delete(listener); },
  };
  await waitForDatasetRetry(0, signal, 0);
  assert.equal(listeners.size, 0);
});

test("rejects empty books and chapters and noncanonical numeric keys", () => {
  assert.throws(() => parseLibrary('{"Empty":{}}'), /at least one chapter/);
  assert.throws(() => parseLibrary('{"Empty":{"1":{}}}'), /at least one verse/);
  for (const key of ["0", "01", "-1", "1.5", "one"]) {
    assert.throws(() => parseLibrary(JSON.stringify({ Example: { [key]: { "1": "text" } } })), /canonical positive integers/);
    assert.throws(() => parseLibrary(JSON.stringify({ Example: { "1": { [key]: "text" } } })), /canonical positive integers/);
  }
});

test("normalizes legacy inline and structured footnotes without changing plain verses", () => {
  assert.deepEqual(parseInlineFootnotes("Plain text."), { text: "Plain text." });
  assert.deepEqual(parseInlineFootnotes("Before {First note} middle {Second [2-3] note} after."), {
    text: "Before  middle  after.",
    segments: ["Before ", { footnote: "1" }, " middle ", { footnote: "2" }, " after."],
    footnotes: [{ number: "1", text: "First note" }, { number: "2", text: "Second [2-3] note" }],
  });

  const library = parseLibrary(JSON.stringify({ Example: { "1": {
    "1": "Legacy {note} text.",
    "2": { segments: ["Structured ", { footnote: "1" }, " text."], footnotes: [{ number: "1", text: "Detail" }] },
  } } }));
  assert.deepEqual(readChapter(library, "Example", "1"), [
    { number: "1", text: "Legacy  text.", segments: ["Legacy ", { footnote: "1" }, " text."], footnotes: [{ number: "1", text: "note" }] },
    { number: "2", text: "Structured  text.", segments: ["Structured ", { footnote: "1" }, " text."], footnotes: [{ number: "1", text: "Detail" }] },
  ]);
});

test("rejects malformed, dangling, duplicate, and unbounded footnotes", () => {
  for (const verse of [
    "Text {unfinished",
    { segments: ["Text", { footnote: "1" }], footnotes: [{ number: "1", text: "One" }, { number: "1", text: "Duplicate" }] },
    { segments: ["Text", { footnote: "2" }], footnotes: [{ number: "1", text: "Missing" }] },
    { segments: ["Text", { footnote: "01" }], footnotes: [{ number: "01", text: "Bad number" }] },
    { segments: ["Text", { footnote: "1" }], footnotes: [{ number: "1", text: "" }] },
    { segments: ["Text", { footnote: "1" }], footnotes: [{ number: "1", text: "x" }], extra: true },
  ]) assert.throws(() => parseLibrary(JSON.stringify({ Example: { "1": { "1": verse } } })), /footnote|marker|verse entry/i);
});

test("streams data and enforces the byte limit when length is absent or understated", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(LIMITS.bytes));
      controller.enqueue(new Uint8Array(1));
    },
    cancel() { cancelled = true; },
  });
  const fetcher = async () => new Response(body, { headers: { "content-length": "1" } });
  await assert.rejects(fetchDatasetText("/data.json", { fetcher, wait: noWait }), /too large/);
  assert.equal(cancelled, true);
});

test("cancels immediately when declared content length exceeds the limit", async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const fetcher = async () => new Response(body, { headers: { "content-length": String(LIMITS.bytes + 1) } });
  await assert.rejects(fetchDatasetText("/data.json", { fetcher, wait: noWait }), /too large/);
  assert.equal(cancelled, true);
});

test("retries transient failures but does not retry permanent HTTP failures", async () => {
  let cancelledBodies = 0;
  const failedResponse = (status) => new Response(new ReadableStream({
    cancel() { cancelledBodies += 1; },
  }), { status });
  let transientCalls = 0;
  const transient = async () => {
    transientCalls += 1;
    return transientCalls === 1 ? failedResponse(503) : new Response("ok");
  };
  assert.equal(await fetchDatasetText("/data.json", { fetcher: transient, wait: noWait }), "ok");
  assert.equal(transientCalls, 2);

  let permanentCalls = 0;
  const permanent = async () => { permanentCalls += 1; return failedResponse(404); };
  await assert.rejects(fetchDatasetText("/data.json", { fetcher: permanent, wait: noWait }), /404/);
  assert.equal(permanentCalls, 1);
  assert.equal(cancelledBodies, 2);
});

test("aborts timed-out attempts and exhausts the bounded retry count", async () => {
  let calls = 0;
  const hanging = (_url, init) => {
    calls += 1;
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
  };
  await assert.rejects(fetchDatasetText("/data.json", { fetcher: hanging, timeoutMs: 1, wait: noWait }), /timed out/);
  assert.equal(calls, 4);
});
