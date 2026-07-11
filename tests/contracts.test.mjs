import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("runtime remains a lean text-only Vite worker application", async () => {
  const [app, libraryHook, manifest] = await Promise.all([
    read("../src/AwmpcBibleApp.tsx"),
    read("../src/data/useBibleLibrary.ts"),
    read("../package.json"),
  ]);
  assert.doesNotMatch(app, /dangerouslySetInnerHTML|innerHTML/);
  assert.match(libraryHook, /data\.worker\?worker/);
  assert.match(libraryHook, /worker\.terminate\(\)/);
  assert.deepEqual(Object.keys(JSON.parse(manifest).dependencies), ["react", "react-dom"]);
});

test("Liquid Glass accessibility and motion fallbacks remain present", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /@supports not/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
  assert.match(styles, /button:focus-visible/);
  assert.match(styles, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /--motion-easing:\s*linear\(/);
});

test("panels retain semantic native controls", async () => {
  const [navigation, history, overlay, profile] = await Promise.all([
    read("../src/ui/NavigationPanel.tsx"),
    read("../src/ui/HistoryPanel.tsx"),
    read("../src/ui/FeatureOverlay.tsx"),
    read("../src/ui/ProfilePanel.tsx"),
  ]);
  assert.match(navigation, /Old Testament/);
  assert.match(navigation, /New Testament/);
  assert.match(navigation, /aria-busy/);
  assert.match(history, /<button type="button"/);
  assert.match(overlay, /<dialog/);
  assert.match(overlay, /onCancel/);
  assert.match(profile, /type="range"/);
  assert.match(profile, /<select/);
});

test("ordinary overlay close remains isolated from verse reveal scrolling", async () => {
  const [app, overlay] = await Promise.all([read("../src/AwmpcBibleApp.tsx"), read("../src/ui/FeatureOverlay.tsx")]);
  const ordinaryClose = app.match(/function finishOverlayClose\(\)[\s\S]*?\n  }/)?.[0] ?? "";
  assert.doesNotMatch(ordinaryClose, /scroll|transitionVerseView|setPassage/);
  assert.doesNotMatch(overlay, /scrollIntoView|scrollTo/);
});

test("AWMPC Bible identity and plain Vite packaging are exact", async () => {
  const [manifest, page, readme] = await Promise.all([read("../package.json"), read("../index.html"), read("../README.md")]);
  assert.equal(JSON.parse(manifest).name, "awmpc-bible");
  assert.match(page, /<title>AWMPC Bible<\/title>/);
  assert.match(readme, /^# AWMPC Bible/m);
  assert.doesNotMatch(`${page}\n${readme}`, /Quiet Reader|awmpc-reader/i);
  await assert.rejects(read("../.openai/hosting.json"));
});
