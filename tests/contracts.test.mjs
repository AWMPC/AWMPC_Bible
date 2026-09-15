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
  assert.match(app, /className="reader-layer" inert={activeFeature !== null} onClick={handleReaderLayerClick}/);
  assert.match(app, /isTrustedReadingTap\(event\.nativeEvent\.isTrusted, event\.detail, interactive\)/);
  assert.doesNotMatch(app, /<ReaderPassageView[^>]*onToggleChrome/);
});

test("published GitHub releases preserve curated changelog entries", async () => {
  const [releaseConfig, releaseWorkflow] = await Promise.all([
    read("../.github/release.yml"),
    read("../.github/workflows/sync-release-notes.yml"),
  ]);
  assert.match(releaseConfig, /categories:/);
  assert.match(releaseConfig, /labels:\s*\n\s+- "\*"/);
  assert.match(releaseWorkflow, /types:\s*\[published\]/);
  assert.match(releaseWorkflow, /CHANGELOG\.md/);
  assert.match(releaseWorkflow, /gh release edit/);
  assert.match(releaseWorkflow, /GH_TOKEN:\s*\$\{\{ github\.token \}\}/);
  assert.match(releaseWorkflow, /awmpc-changelog-range/);
  assert.match(releaseWorkflow, /git describe --tags --abbrev=0/);
  assert.match(releaseWorkflow, /fetch-depth: 0/);
  assert.match(releaseWorkflow, /git log --no-merges/);
});

test("green pushes gate semver tags and releases on every push workflow", async () => {
  const workflow = await read("../.github/workflows/release-after-green.yml");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\n\s+- Deploy GitHub Pages/);
  assert.doesNotMatch(workflow, /workflows:\s*[\s\S]*?- Quality/);
  assert.match(workflow, /- Deploy GitHub Pages/);
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /actions:\s*read/);
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /head_sha/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /git config user\.name "github-actions\[bot\]"/);
  assert.match(workflow, /git config user\.email "41898282\+github-actions\[bot\]@users\.noreply\.github\.com"/);
  assert.match(workflow, /event=push/);
  assert.match(workflow, /gh api --paginate[\s\S]*\| jq -r/);
  assert.doesNotMatch(workflow, /--slurp[\s\S]*--jq/);
  assert.match(workflow, /conclusion/);
  assert.match(workflow, /previous_version/);
  assert.match(workflow, /release_needed=false/);
  assert.match(workflow, /git tag --annotate/);
  assert.match(workflow, /gh release create/);
  assert.match(workflow, /--generate-notes/);
  assert.match(workflow, /--title "\$RELEASE_TAG"/);
  assert.doesNotMatch(workflow, /--title "AWMPC Bible/);
  assert.match(workflow, /gh release edit "\$RELEASE_TAG" --title "\$RELEASE_TAG"/);
  assert.match(workflow, /CHANGELOG\.md/);
  assert.match(workflow, /gh release edit/);
  assert.match(workflow, /awmpc-changelog-range/);
  assert.match(workflow, /git describe --tags --abbrev=0/);
  assert.match(workflow, /git log --no-merges/);
});

test("Liquid Glass accessibility and motion fallbacks remain present", async () => {
  const [styles, overlay, motion] = await Promise.all([read("../src/styles.css"), read("../src/ui/FeatureOverlay.tsx"), read("../src/ui/motion.ts")]);
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /-webkit-backdrop-filter:/);
  assert.match(styles, /@supports not/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
  assert.match(styles, /button:focus-visible/);
  assert.match(styles, /--navigation-column-count:\s*3/);
  assert.match(styles, /grid-template-columns:\s*repeat\(var\(--navigation-column-count\), minmax\(0, 1fr\)\)/);
  assert.match(styles, /@container navigation-panel \(min-width: 42rem\)[\s\S]*?--navigation-column-count:\s*6/);
  assert.match(styles, /@container navigation-panel \(min-width: 60rem\)[\s\S]*?--navigation-column-count:\s*9/);
  assert.match(styles, /--motion-easing:\s*linear\(/);
  assert.match(motion, /MOTION_DURATION_MS = 210/);
  assert.match(styles, /--motion-duration:\s*210ms/);
  assert.match(styles, /--screen-edge-inset:\s*1rem/);
  assert.doesNotMatch(styles, /\.reading-header|\.chapter-indicator/);
  assert.match(styles, /\.reading-pane\s*\{[^}]*padding:\s*var\(--reader-inline-padding\)/);
  assert.doesNotMatch(styles, /\.reading-pane article\s*\{[^}]*margin-top/);
  assert.match(styles, /\.reading-pane article\s*\{[^}]*max-width:\s*calc\(70ch \+ var\(--verse-number-gutter\) \+ var\(--verse-column-gap\)\)/);
  assert.match(styles, /\.verses\s*\{[^}]*gap:\s*\.75rem/);
  assert.match(styles, /\.workspace\s*\{[^}]*width:\s*min\(100%, calc\(70ch \+ var\(--verse-number-gutter\)/);
  assert.match(styles, /--verse-column-gap:\s*\.4rem/);
  assert.match(styles, /--location-controls-clearance:/);
  assert.match(styles, /\.workspace\s*\{[^}]*padding:\s*var\(--location-controls-clearance\)/);
  assert.match(styles, /--edge-inset-left:\s*max\(var\(--screen-edge-inset\), env\(safe-area-inset-left\)\)/);
  assert.match(styles, /--edge-inset-right:\s*max\(var\(--screen-edge-inset\), env\(safe-area-inset-right\)\)/);
  assert.match(styles, /\.workspace\s*\{[^}]*padding:[^;}]*var\(--edge-inset-right\)[^;}]*var\(--edge-inset-left\)/);
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
  assert.match(styles, /\.reading-location-floater\s*\{[^}]*box-shadow:[^;}]*var\(--glass-gleam\)/);
  assert.match(styles, /\.reading-location-floater\s*\{[^}]*border-radius:\s*22px[^}]*backdrop-filter:\s*blur\(28px\) saturate\(140%\)/);
  assert.match(styles, /\.floating-dock\s*\{[^}]*box-shadow:[^;}]*var\(--glass-gleam\)/);
  assert.match(styles, /\.overlay-close\s*\{[^}]*box-shadow:[^;}]*var\(--glass-gleam\)/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.overlay-close\s*\{[^}]*box-shadow:\s*none/);
});

test("reader backgrounds use a static subtle tint in day and night modes", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /--day-bg:\s*#f1f5f7/);
  assert.match(styles, /--night-bg:\s*#151f24/);
  assert.match(styles, /--bg:\s*light-dark\(var\(--day-bg\), var\(--night-bg\)\)/);
  assert.doesNotMatch(styles, /--(?:day|night)-bg-current/);
  assert.doesNotMatch(styles, /calc\(var\(--chapter-progress\) \* 100%\)/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.awmpc-bible-shell\s*\{\s*background:\s*Canvas/);
});

test("page edge exposes chapter progress through a quiet rail", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /body::before\s*\{[^}]*position:\s*fixed[^}]*left:\s*0[^}]*width:\s*3px/);
  assert.match(styles, /body::before\s*\{[^}]*background:\s*var\(--accent\)/);
  assert.match(styles, /body::before\s*\{[^}]*pointer-events:\s*none/);
  assert.match(styles, /body::before\s*\{[^}]*transform:\s*scaleY\(var\(--chapter-progress\)\)/);
  assert.match(styles, /body::before\s*\{[^}]*opacity:\s*\.55/);
  assert.doesNotMatch(styles, /\.reading-pane::before/);
});

test("touch reader controls do not retain desktop hover highlights", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.chapter-floater-arrow:hover:not\(:disabled\)/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.reading-location-button:hover/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.dock-button:hover/);
  assert.match(styles, /\.chapter-floater-current\[aria-expanded="true"\]\s*\{[^}]*background:\s*var\(--surface-strong\)/);
  assert.match(styles, /\.reading-location-button\[aria-expanded="true"\]\s*\{[^}]*background:\s*var\(--surface-strong\)/);
  assert.match(styles, /\.dock-button\[aria-expanded="true"\]\s*\{[^}]*background:\s*var\(--surface-strong\)/);
  assert.match(styles, /\.reading-location-button\s*\{[^}]*color:\s*var\(--muted\)/);
  assert.match(styles, /\.chapter-floater-arrow, \.chapter-floater-current\s*\{[^}]*color:\s*var\(--muted\)/);
  assert.match(styles, /\.chapter-floater-arrow, \.chapter-floater-current\s*\{[^}]*border-radius:\s*16px/);
  assert.match(styles, /\.chapter-floater-current\[aria-expanded="true"\], \.reading-location-button\[aria-expanded="true"\]\s*\{[^}]*color:\s*var\(--accent\)[^}]*box-shadow:\s*inset 0 1px 0 rgba\(255, 255, 255, \.24\)/);
  assert.match(styles, /\.reading-location-floater > :is\([^}]*\):not\(:last-child\)::after\s*\{[^}]*top:\s*22%[^}]*bottom:\s*22%[^}]*width:\s*1px/);
});

test("book floater centers its labels like the chapter floater", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /\.book-location-button\s*\{[^}]*display:\s*grid[^}]*align-content:\s*center[^}]*justify-items:\s*start/);
});

test("selected verse font inherits across reader controls and feature sheets", async () => {
  const styles = await read("../src/styles.css");
  assert.match(styles, /\.awmpc-bible-shell\s*\{[^}]*font-family:\s*var\(--verse-font-family\)/);
  assert.doesNotMatch(styles, /\.book-location-button\s*\{[^}]*font-family:\s*ui-serif/);
  for (const selector of ["overlay-header h2", "empty-feature h3", "account-avatar", "account-card h3", "setting-heading h3", "font-setting label"]) {
    assert.doesNotMatch(styles, new RegExp(`\\.${selector.replace(" ", "\\s+")}\\s*\\{[^}]*ui-serif`));
  }
});

test("panels retain semantic native controls", async () => {
  const [app, navigation, history, search, overlay, overlayLifecycle, profile, account, verseActions, marquee, styles, features] = await Promise.all([
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
    read("../src/ui/features.ts"),
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
  assert.match(styles, /\.feature-overlay\s*\{[^}]*--overlay-desktop-width:\s*50vw[^}]*right:\s*var\(--edge-inset-right\)[^}]*width:\s*min\(var\(--overlay-desktop-width\), calc\(100vw - var\(--edge-inset-left\) - var\(--edge-inset-right\)\)\)[^}]*min-width:\s*min\(50vw,[^}]*height:\s*max\(0px, calc\(var\(--overlay-max-height/);
  assert.match(styles, /\.feature-overlay\[data-feature="search"\], \.feature-overlay\[data-feature="profile"\]\s*\{[^}]*--overlay-desktop-width:\s*max\(50vw, 46rem\)/);
  assert.match(styles, /\.overlay-surface\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.feature-overlay\s*\{[^}]*left:\s*var\(--edge-inset-left\)[^}]*width:\s*auto[^}]*min-width:\s*0/);
  assert.match(styles, /\.reading-location-controls\.is-hidden \.reading-location-floater\s*\{[^}]*translate:\s*-50% calc\(-100%/);
  assert.match(styles, /\.reading-location-floater\s*\{[^}]*width:\s*max-content[^}]*max-width:\s*calc\(100vw - var\(--edge-inset-left\) - var\(--edge-inset-right\)\)[^}]*grid-template-columns:\s*2\.5rem minmax\(min-content, max-content\) max-content 2\.5rem/);
  assert.doesNotMatch(styles, /\.chapter-floater-current\s*\{[^}]*min-width:/);
  assert.match(styles, /@media \(min-width: 721px\)[\s\S]*?\.reading-location-floater\s*\{[^}]*top:\s*auto[^}]*bottom:\s*max\([^}]*left:\s*var\(--edge-inset-left\)/);
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
  assert.match(features, /Object\.freeze\(FEATURES\.filter\(\(feature\) => feature\.id !== "navigation"\)\)/);
  assert.match(features, /return FEATURES\.find\(\(feature\) => feature\.id === id\)/);
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
  assert.match(verseActions, /MOTION_DURATION_MS/);
  assert.match(verseActions, /inert=\{!target\}/);
  assert.match(styles, /\.verse-actions-menu\.is-opening\s*\{[^}]*verse-actions-enter var\(--motion-duration\) var\(--motion-easing\)/);
  assert.match(styles, /\.verse-actions-menu\.is-closing\s*\{[^}]*verse-actions-exit var\(--motion-duration\) var\(--motion-easing\)/);
  assert.match(styles, /prefers-reduced-motion:[\s\S]*?\.verse-actions-menu\.is-opening, \.verse-actions-menu\.is-closing\s*\{\s*animation:\s*none/);
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
  assert.match(page, /rel="icon" type="image\/png" sizes="192x192" href="\.\/icons\/icon-192\.png"/);
  assert.match(readme, /^# AWMPC Bible/m);
  assert.doesNotMatch(`${page}\n${readme}`, /Quiet Reader|awmpc-reader/i);
  assert.equal(JSON.parse(manifest).scripts.prebuild, "npm run stage:data");
  assert.equal(JSON.parse(manifest).scripts.predev, undefined);
  assert.match(datasetStaging, /readdir\(root\)/);
  assert.ok(datasetStaging.includes("/^bible-.+\\.json$/i"));
  assert.match(datasetStaging, /bibles\.json/);
  assert.match(datasetStaging, /TextDecoder\("utf-8", \{ fatal: true \}\)/);
  assert.ok(viteConfig.includes("pathname.match(/^\\/data\\/(bible-.+\\.json)$/i)"));
  assert.match(viteConfig, /pathname === "\/data\/bibles\.json"/);
  assert.match(viteConfig, /Cache-Control", "no-store"/);
  assert.match(viteConfig, /import packageMetadata from "\.\/package\.json" with \{ type: "json" \}/);
  assert.match(viteConfig, /__APP_VERSION__:\s*JSON\.stringify\(packageMetadata\.version\)/);
  assert.match(viteTypes, /declare const __APP_VERSION__: string/);
  assert.match(overlay, /className="overlay-version"[^>]*>\{__APP_VERSION__\}<\/span>/);
  await assert.rejects(read("../.openai/hosting.json"));
});
