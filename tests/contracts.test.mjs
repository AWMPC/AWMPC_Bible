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
  assert.deepEqual(Object.keys(JSON.parse(manifest).dependencies), ["firebase", "react", "react-dom"]);
  assert.match(app, /useReaderPersistence/);
});

test("Liquid Glass accessibility and motion fallbacks remain present", async () => {
  const [styles, overlay, motion] = await Promise.all([read("../src/styles.css"), read("../src/ui/FeatureOverlay.tsx"), read("../src/ui/motion.ts")]);
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /-webkit-backdrop-filter:/);
  assert.match(styles, /@supports not/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
  assert.match(styles, /button:focus-visible/);
  assert.match(styles, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /--motion-easing:\s*linear\(/);
  assert.match(motion, /MOTION_DURATION_MS = 210/);
  assert.match(styles, /--motion-duration:\s*210ms/);
  assert.doesNotMatch(styles, /\.reading-header|\.chapter-indicator/);
  assert.match(styles, /\.reading-pane\s*\{[^}]*padding:\s*var\(--reader-inline-padding\)/);
  assert.doesNotMatch(styles, /\.reading-pane article\s*\{[^}]*margin-top/);
  assert.match(styles, /\.reading-pane article\s*\{[^}]*max-width:\s*calc\(70ch \+ var\(--verse-number-gutter\) \+ var\(--verse-column-gap\)\)/);
  assert.match(styles, /\.verses\s*\{[^}]*gap:\s*\.75rem/);
  assert.match(styles, /\.workspace\s*\{[^}]*width:\s*min\(100%, calc\(70ch \+ var\(--verse-number-gutter\)/);
  assert.match(styles, /--verse-column-gap:\s*\.4rem/);
  assert.match(styles, /--location-controls-clearance:/);
  assert.match(styles, /\.workspace\s*\{[^}]*padding:\s*var\(--location-controls-clearance\)/);
  assert.match(styles, /\.awmpc-bible-shell\s*\{[^}]*background:\s*var\(--bg\)/);
  assert.doesNotMatch(styles, /radial-gradient|--(?:day-|night-)?glow-(?:one|two)|\.awmpc-bible-shell::before|\.awmpc-bible-shell::after/);
  assert.match(styles, /grid-template-columns:\s*var\(--verse-number-gutter\) minmax\(0, 1fr\)/);
  assert.match(styles, /\.verse-language-row\s*\{[^}]*display:\s*grid/);
  assert.match(styles, /data-dual-language="true"/);
  assert.match(styles, /data-text-scale="standard"[^}]*--verse-line-height:\s*1\.5/);
});

test("floating glass chrome keeps an adaptive gleam with forced-color restraint", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /--day-glass-gleam:/);
  assert.match(styles, /--night-glass-gleam:/);
  assert.match(styles, /--glass-gleam:\s*light-dark\(var\(--day-glass-gleam\), var\(--night-glass-gleam\)\)/);
  assert.match(styles, /\.reading-location-button\s*\{[^}]*box-shadow:[^;}]*var\(--glass-gleam\)/);
  assert.match(styles, /\.floating-dock\s*\{[^}]*box-shadow:[^;}]*var\(--glass-gleam\)/);
  assert.match(styles, /\.overlay-close\s*\{[^}]*box-shadow:[^;}]*var\(--glass-gleam\)/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.overlay-close\s*\{[^}]*box-shadow:\s*none/);
});

test("chapter progress drives day and night water palettes", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /--chapter-progress:\s*0/);
  assert.match(styles, /--day-bg-start:\s*#eef3f6/);
  assert.match(styles, /--day-bg-end:\s*#77a9c2/);
  assert.match(styles, /--night-bg-start:\s*#171326/);
  assert.match(styles, /--night-bg-end:\s*#073b42/);
  assert.match(styles, /\.awmpc-bible-shell\s*\{[^}]*--day-bg-current:\s*color-mix\(in oklab,[^;]*calc\(var\(--chapter-progress\) \* 100%\)\)/);
  assert.match(styles, /\.awmpc-bible-shell\s*\{[^}]*--night-bg-current:\s*color-mix\(in oklab,[^;]*calc\(var\(--chapter-progress\) \* 100%\)\)/);
  assert.match(styles, /--bg:\s*light-dark\(var\(--day-bg-current\), var\(--night-bg-current\)\)/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.awmpc-bible-shell\s*\{\s*background:\s*Canvas/);
});

test("panels retain semantic native controls", async () => {
  const [app, navigation, history, search, overlay, overlayLifecycle, profile, account, verseActions, marquee, styles] = await Promise.all([
    read("../src/AwmpcBibleApp.tsx"),
    read("../src/ui/NavigationPanel.tsx"),
    read("../src/ui/HistoryPanel.tsx"),
    read("../src/ui/SearchPanel.tsx"),
    read("../src/ui/FeatureOverlay.tsx"),
    read("../src/ui/useOverlayLifecycle.ts"),
    read("../src/ui/ProfilePanel.tsx"),
    read("../src/ui/CloudAccountCard.tsx"),
    read("../src/ui/VerseActionsMenu.tsx"),
    read("../src/ui/OverflowMarquee.tsx"),
    read("../src/styles.css"),
  ]);
  assert.match(navigation, /Old Testament/);
  assert.match(navigation, /New Testament/);
  assert.match(navigation, /aria-busy/);
  assert.match(history, /<button type="button"/);
  assert.match(overlay, /<dialog/);
  assert.match(overlayLifecycle, /dialog\.show\(\)/);
  assert.doesNotMatch(overlayLifecycle, /showModal\(\)/);
  assert.match(overlay, /onCancel/);
  assert.match(app, /inert=\{activeFeature !== null\}/);
  assert.match(app, /<ReadingLocationControls[^>]*visible=\{chromeVisible && activeFeature === null\}/);
  assert.match(app, /<FloatingDock[^>]*visible=\{chromeVisible\}/);
  assert.doesNotMatch(app, /reading-header|chapter-indicator/);
  assert.match(app, /feature === activeFeature/);
  assert.match(app, /overlayRef\.current\?\.keepOpen\(\)/);
  assert.match(styles, /\.overlay-shade\s*\{[^}]*opacity:\s*0[^}]*transition:\s*opacity var\(--motion-duration\) var\(--motion-easing\)/);
  assert.match(styles, /\.overlay-shade\.is-visible\s*\{[^}]*opacity:\s*1/);
  assert.match(styles, /\.reading-location-controls\.is-hidden \.reading-location-button\s*\{[^}]*translate:\s*0 calc\(-100%/);
  assert.match(history, /<button type="button"/);
  assert.match(profile, /type="range"/);
  assert.match(profile, /className="scale-marks" aria-hidden="true"/);
  assert.match(profile, /className="scale-tick"/);
  assert.match(styles, /--range-thumb-size:\s*30px/);
  assert.doesNotMatch(styles, /\.scale-labels\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  assert.match(profile, /<select/);
  assert.match(account, /referrerPolicy="no-referrer"/);
  assert.match(account, /loading="lazy"/);
  assert.match(account, /decoding="async"/);
  assert.match(account, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(account, /<Skeleton rows=\{2\}/);
  assert.match(profile, />Primary language</);
  assert.match(profile, />Secondary language</);
  assert.match(navigation, /book-choice-secondary/);
  assert.match(history, /history-language/);
  assert.match(search, /type="search"/);
  assert.match(search, /ref=\{inputRef\}/);
  assert.match(app, /initialFocusRef=\{activeFeature === "search" \? searchInputRef : undefined\}/);
  assert.match(overlayLifecycle, /initialFocusRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(overlayLifecycle, /cancelAnimationFrame\(animationFrame\)/);
  assert.match(search, /aria-busy/);
  assert.match(search, /<Skeleton/);
  assert.doesNotMatch(search, /dangerouslySetInnerHTML|innerHTML/);
  assert.match(marquee, /new ResizeObserver/);
  assert.match(marquee, /observer\?\.disconnect\(\)/);
  assert.match(marquee, /cancelAnimationFrame\(frame\)/);
  assert.doesNotMatch(marquee, /innerHTML|setInterval/);
  assert.doesNotMatch(app, /history\.filter\(/);
  assert.match(verseActions, /role="menu"/);
  assert.match(verseActions, />Copy Verse</);
  assert.match(verseActions, />Copy Link</);
});

test("overlay geometry uses owned refs instead of global selectors", async () => {
  const sources = await Promise.all([
    read("../src/AwmpcBibleApp.tsx"),
    read("../src/ui/FeatureOverlay.tsx"),
    read("../src/ui/useOverlayViewport.ts"),
    read("../src/ui/ReadingLocationControls.tsx"),
    read("../src/ui/NavigationPanel.tsx"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /document\.querySelector|\.closest<HTMLElement>/);
});

test("ordinary overlay close remains isolated from verse reveal scrolling", async () => {
  const [app, overlay] = await Promise.all([read("../src/AwmpcBibleApp.tsx"), read("../src/ui/FeatureOverlay.tsx")]);
  const ordinaryClose = app.match(/function finishOverlayClose\(\)[\s\S]*?\n  }/)?.[0] ?? "";
  assert.doesNotMatch(ordinaryClose, /scroll|transitionVerseView|setPassage/);
  assert.doesNotMatch(overlay, /scrollIntoView|scrollTo\(/);
});

test("AWMPC Bible identity and plain Vite packaging are exact", async () => {
  const [manifest, page, readme, datasetStaging, viteConfig, overlay, viteTypes] = await Promise.all([read("../package.json"), read("../index.html"), read("../README.md"), read("../scripts/stageDatasets.mjs"), read("../vite.config.ts"), read("../src/ui/FeatureOverlay.tsx"), read("../src/vite-env.d.ts")]);
  const packageMetadata = JSON.parse(manifest);
  assert.equal(packageMetadata.name, "awmpc-bible");
  assert.match(packageMetadata.version, /^\d+\.\d+\.\d+$/);
  assert.match(page, /<title>AWMPC Bible<\/title>/);
  assert.match(readme, /^# AWMPC Bible/m);
  assert.doesNotMatch(`${page}\n${readme}`, /Quiet Reader|awmpc-reader/i);
  assert.equal(JSON.parse(manifest).scripts.prebuild, "npm run stage:data");
  assert.equal(JSON.parse(manifest).scripts.predev, undefined);
  assert.match(datasetStaging, /\["bible-en\.json", "bible-ko\.json"\]/);
  assert.match(datasetStaging, /TextDecoder\("utf-8", \{ fatal: true \}\)/);
  assert.match(viteConfig, /\["\/data\/bible-ko\.json", "bible-ko\.json"\]/);
  assert.match(viteConfig, /Cache-Control", "no-store"/);
  assert.match(viteConfig, /import packageMetadata from "\.\/package\.json" with \{ type: "json" \}/);
  assert.match(viteConfig, /__APP_VERSION__:\s*JSON\.stringify\(packageMetadata\.version\)/);
  assert.match(viteTypes, /declare const __APP_VERSION__: string/);
  assert.match(overlay, /className="overlay-version"[^>]*>\{__APP_VERSION__\}<\/span>/);
  await assert.rejects(read("../.openai/hosting.json"));
});
