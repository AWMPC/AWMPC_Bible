import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");

test("Firestore rules isolate user documents and deny deletion and fallback access", () => {
  assert.match(rules, /request\.auth != null && request\.auth\.uid == uid/);
  assert.match(rules, /match \/users\/\{uid\}/);
  assert.match(rules, /allow create, update: if owns\(uid\) && validUserDocument\(request\.resource\.data\)/);
  assert.match(rules, /allow delete: if false/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
});

test("Firestore rules bound canonical and legacy activity arrays", () => {
  assert.match(rules, /data\.awmpcBible\.history\.size\(\) <= 200/);
  assert.match(rules, /data\.awmpcBible\.searchHistory\.size\(\) <= 20/);
  assert.match(rules, /boundedList\(data, "history", 200\)/);
  assert.match(rules, /boundedList\(data, "searchHistory", 20\)/);
  assert.match(rules, /data\.awmpcBible\.schemaVersion <= 2/);
});
