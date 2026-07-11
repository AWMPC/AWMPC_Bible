import test from "node:test";
import assert from "node:assert/strict";
import { fetchDatasetText } from "../src/data/fetchDataset.ts";
import { LIMITS, parseLibrary } from "../src/data/library.ts";

const noWait = async () => {};

test("rejects empty books and chapters and noncanonical numeric keys", () => {
  assert.throws(() => parseLibrary('{"Empty":{}}'), /at least one chapter/);
  assert.throws(() => parseLibrary('{"Empty":{"1":{}}}'), /at least one verse/);
  for (const key of ["0", "01", "-1", "1.5", "one"]) {
    assert.throws(() => parseLibrary(JSON.stringify({ Example: { [key]: { "1": "text" } } })), /canonical positive integers/);
    assert.throws(() => parseLibrary(JSON.stringify({ Example: { "1": { [key]: "text" } } })), /canonical positive integers/);
  }
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
  let transientCalls = 0;
  const transient = async () => {
    transientCalls += 1;
    return transientCalls === 1 ? new Response("busy", { status: 503 }) : new Response("ok");
  };
  assert.equal(await fetchDatasetText("/data.json", { fetcher: transient, wait: noWait }), "ok");
  assert.equal(transientCalls, 2);

  let permanentCalls = 0;
  const permanent = async () => { permanentCalls += 1; return new Response("missing", { status: 404 }); };
  await assert.rejects(fetchDatasetText("/data.json", { fetcher: permanent, wait: noWait }), /404/);
  assert.equal(permanentCalls, 1);
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
