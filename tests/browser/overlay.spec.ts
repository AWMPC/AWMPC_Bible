import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const packageMetadata = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };
async function waitForScrollIdle(page: import("@playwright/test").Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    let timer = 0;
    const finish = () => {
      window.removeEventListener("scroll", onScroll);
      resolve();
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(finish, 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    timer = window.setTimeout(finish, 80);
  }));
}

async function revealDock(page: import("@playwright/test").Page) {
  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(page.locator(".floating-dock")).not.toHaveClass(/is-hidden/);
}

const dataset = {
  Genesis: {
    "1": Object.fromEntries(Array.from({ length: 80 }, (_, index) => [String(index + 1), index === 0 ? "Verse 1 {First note} text with {Second note} details." : `Verse ${index + 1} text for browser testing.`])),
  },
  Matthew: Object.fromEntries(Array.from({ length: 20 }, (_, chapterIndex) => [String(chapterIndex + 1), Object.fromEntries(Array.from({ length: 12 }, (_, verseIndex) => [String(verseIndex + 1), `Matthew chapter ${chapterIndex + 1} verse ${verseIndex + 1}.`]))])),
  Acts: { "13": { "6": "They met a Jewish sorcerer and false prophet named Bar-Jesus." } },
  ...Object.fromEntries(Array.from({ length: 64 }, (_, index) => [`Reference ${index + 1}`, { "1": { "1": `Reference verse ${index + 1}.` } }])),
};

const koreanDataset = {
  "창세기": { "1": Object.fromEntries(Array.from({ length: 80 }, (_, index) => [String(index + 1), `한국어 시험 구절 ${index + 1} 본문은 언어별 줄 길이가 달라도 같은 구절을 유지합니다. `.repeat(3).trim()])) },
  "마태복음": Object.fromEntries(Array.from({ length: 20 }, (_, chapterIndex) => [String(chapterIndex + 1), { "1": `마태복음 ${chapterIndex + 1}장 1절.` }])),
};

test.beforeEach(async ({ page }) => {
  await page.route("**/data/bibles.json", (route) => route.fulfill({ json: [{ id: "en", label: "English" }, { id: "ko", label: "Korean" }] }));
  await page.route("**/data/bible-en.json", (route) => route.fulfill({ json: dataset }));
  await page.route("**/data/bible-ko.json", (route) => route.fulfill({ json: koreanDataset }));
  await page.goto("/");
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
});

test("refresh restores the last validated reading chapter", async ({ page }) => {
  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();

  await page.reload();

  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
});

test("reader arrows and the chapter floater navigate across Bible book boundaries without focusing verses", async ({ page }) => {
  const firstVerse = page.locator("#verse-1-1");
  await firstVerse.click();
  await expect(firstVerse).not.toHaveAttribute("tabindex");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });

  const previous = page.getByRole("button", { name: "Previous chapter" });
  const next = page.getByRole("button", { name: "Next chapter" });
  await expect(previous).toBeEnabled();
  await expect(next).toBeEnabled();
  await previous.click();
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
});

test("focused floater keys and rapid chapter requests continue through the Bible", async ({ page }) => {
  const next = page.getByRole("button", { name: "Next chapter" });
  await next.focus();
  await page.keyboard.press("ArrowRight");
  await expect(next).toBeEnabled();
  await next.click();
  await next.click();
  await expect(page.locator('article[aria-label="Matthew chapter 3"]')).toBeVisible();
});

test("reader arrows navigate while a dock control holds focus", async ({ page }) => {
  const profile = page.getByRole("button", { name: "Profile and preferences" });
  await profile.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
});

test("location bar centers four lined segments and moves to the desktop lower-left", async ({ page }) => {
  const previous = page.getByRole("button", { name: "Previous chapter" });
  const book = page.getByRole("button", { name: "Choose book, currently Genesis" });
  const current = page.getByRole("button", { name: "Choose chapter, currently chapter 1" });
  const next = page.getByRole("button", { name: "Next chapter" });
  const floater = page.locator(".reading-location-floater");
  await expect(floater).toHaveCount(1);
  await expect.poll(() => floater.evaluate((element) => {
    const style = getComputedStyle(element);
    return { right: style.right, bottom: style.bottom, left: style.left };
  })).toEqual({ right: "auto", bottom: "16px", left: "16px" });
  await expect(previous.locator("svg path")).toHaveCount(1);
  await expect(next.locator("svg path")).toHaveCount(1);
  const geometry = await Promise.all([previous, book, current, next].map((button) => button.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const divider = getComputedStyle(element, "::after");
    return { centerY: box.y + box.height / 2, dividerWidth: divider.width, dividerTop: divider.top, dividerBottom: divider.bottom };
  })));
  expect(geometry.map(({ centerY }) => centerY)).toEqual(geometry.map(() => geometry[1].centerY));
  expect(geometry.slice(0, 3).map(({ dividerWidth }) => dividerWidth)).toEqual(["1px", "1px", "1px"]);
  expect(geometry.slice(0, 3).every(({ dividerTop, dividerBottom }) => dividerTop === dividerBottom)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => floater.evaluate((element) => {
    const style = getComputedStyle(element);
    return { top: style.top, right: style.right, bottom: style.bottom, left: style.left };
  })).toEqual({ top: "16px", right: "auto", bottom: "auto", left: "50%" });
  await expect.poll(() => floater.evaluate((element) => element.getBoundingClientRect().width < innerWidth - 32)).toBe(true);
});

test("hidden reader chrome reveals an embossed bilingual location header without floater focus borders", async ({ page }) => {
  const emboss = page.locator(".reading-location-emboss");
  const currentChapter = page.getByRole("button", { name: "Choose chapter, currently chapter 1" });
  const profile = page.getByRole("button", { name: "Profile and preferences" });
  await currentChapter.focus();
  await expect.poll(() => currentChapter.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  await profile.focus();
  await expect.poll(() => profile.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  await profile.click();
  await page.getByRole("combobox", { name: "Secondary language" }).selectOption("ko");
  await page.locator(".overlay-close").click();
  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(emboss).toHaveCSS("opacity", "1");
  await expect(emboss).toContainText("Genesis");
  await expect(emboss).toContainText("창세기");
  await expect(emboss).toContainText("Chapter 1");
  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(emboss).toHaveCSS("opacity", "0");
});

test("switches between the local English and Korean datasets", async ({ page }) => {
  await page.locator("#verse-1-40").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("verse-1-40")?.scrollIntoView({ block: "center" }));
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const language = page.getByRole("combobox", { name: "Primary language" });
  await language.selectOption("ko");
  const koreanTarget = page.locator("#verse-1-40");
  await expect(page.locator('article[aria-label="창세기 chapter 1"]')).toBeVisible();
  await expect.poll(async () => {
    const box = await koreanTarget.boundingBox();
    return box ? Math.abs(box.y + box.height / 2 - (await page.evaluate(() => innerHeight / 2))) : 999;
  }).toBeLessThan(6);
  await waitForScrollIdle(page);
  await page.locator(".overlay-close").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(async () => {
    const box = await koreanTarget.boundingBox();
    return box ? Math.abs(box.y + box.height / 2 - (await page.evaluate(() => innerHeight / 2))) : 999;
  }).toBeLessThan(6);

  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await language.selectOption("en");
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
});

test("persists the selected Bible language", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const language = page.getByRole("combobox", { name: "Primary language" });
  await expect(language).toHaveValue("en");
  await language.selectOption("ko");
  await expect(language).toHaveValue("ko");

  const reloadRequests: string[] = [];
  page.on("request", (request) => reloadRequests.push(request.url()));
  await page.reload();
  await expect(page.locator('article[aria-label="창세기 chapter 1"]')).toBeVisible();
  expect(reloadRequests.some((url) => url.endsWith("/data/bible-en.json"))).toBe(false);
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await expect(page.getByRole("combobox", { name: "Primary language" })).toHaveValue("ko");
});

test("keeps the local reader private and usable when cloud sync is not configured", async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on("request", (request) => {
    if (/googleapis|firebaseio|googleusercontent/.test(request.url())) remoteRequests.push(request.url());
  });
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await expect(page.getByText("Cloud sync is not configured for this deployment.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Appearance" })).toBeEnabled();
  expect(remoteRequests).toEqual([]);
});

test("shows the package semver in the Profile sheet", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const version = page.locator(".overlay-version");
  await expect(version).toBeVisible();
  await expect(version).toHaveText(packageMetadata.version);
  await expect(version).toHaveAttribute("aria-label", `Version ${packageMetadata.version}`);
});

test("browser Back closes dock and top sheets before leaving the reader", async ({ page }) => {
  for (const trigger of [page.getByRole("button", { name: "Search" }), page.getByRole("button", { name: /Choose book, currently Genesis/ })]) {
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
  }
});

test("ordinary close restores one switched-sheet entry before normal Back", async ({ page }) => {
  await page.evaluate(() => {
    window.history.replaceState({ testStep: "before-reader" }, "", "/?history-step=before-reader");
    window.history.pushState({ testStep: "reader" }, "", "/");
  });
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await page.locator(".overlay-close").click();
  await expect.poll(() => page.evaluate(() => ({
    dialogOpen: document.querySelector("dialog")?.open ?? false,
    historyStep: (window.history.state as { testStep?: string } | null)?.testStep ?? null,
  }))).toEqual({ dialogOpen: true, historyStep: "reader" });
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.history.state?.testStep)).toBe("before-reader");
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
});

test("keeps sheets usable without horizontal overflow on desktop and mobile", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Navigate books and chapters" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Books", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.locator(".overlay-close").click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
});

test("offers only Sans, Serif, and Mono fonts in that order", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const font = page.getByRole("combobox", { name: "Verse font" });
  await expect(font.locator("option")).toHaveText(["Sans", "Serif", "Mono"]);
  await font.selectOption("monospace");
  await expect(page.locator(".awmpc-bible-shell")).toHaveAttribute("data-verse-font", "monospace");
});

test("updates the text-scale control at every supported setting", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const slider = page.getByRole("slider", { name: "Verse text size" });
  const textScaleOutput = page.locator('section[aria-labelledby="reading-size-title"] .setting-heading output strong');
  const labels = ["Compact", "Standard", "Comfortable", "Large", "Extra large"];
  const markers = ["80%", "90%", "100%", "110%", "120%"];
  await expect(page.locator(".scale-mark")).toHaveCount(labels.length);
  await expect(page.locator(".scale-label")).toHaveText(markers);
  await expect(page.locator(".scale-marks")).toHaveAttribute("aria-hidden", "true");

  for (let index = 0; index < labels.length; index += 1) {
    await slider.fill(String(index));
    await expect(slider).toHaveAttribute("aria-valuetext", labels[index]);
    await expect(textScaleOutput).toHaveText(labels[index]);
  }

});

test("stacks primary and secondary verses with localized book labels and actions", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await page.getByRole("combobox", { name: "Secondary language" }).selectOption("ko");
  const firstVerse = page.locator("#verse-1-1");
  await expect(firstVerse.locator(".verse-language-row")).toHaveCount(2);
  await expect(firstVerse.locator(".verse-language-row").nth(0)).toHaveAttribute("lang", "en");
  await expect(firstVerse.locator(".verse-language-row").nth(1)).toHaveAttribute("lang", "ko");
  await page.locator(".overlay-close").click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const bookControl = page.getByRole("button", { name: "Choose book, currently Genesis, 창세기" });
  await expect(bookControl).toContainText("Genesis");
  await expect(bookControl).toContainText("창세기");
  await bookControl.click();
  const currentBook = page.locator('section[aria-labelledby="books-title"] button[aria-current="page"]');
  await expect(currentBook).toContainText("Genesis");
  await expect(currentBook).toContainText("창세기");
  await page.locator(".overlay-close").click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Actions for Korean verse 1", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Copy Verse" })).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("— 창세기 1:1");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("searchbox", { name: "Search active Bible text" }).fill("한국어 시험 구졀 40");
  const koreanResult = page.locator(".search-results button").filter({ hasText: /창세기 1:40/ });
  await expect(koreanResult).toContainText("Korean");
  await koreanResult.click();
  await expect(page.locator("#verse-1-40")).toBeInViewport();
  await revealDock(page);
  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.getByRole("button", { name: /^창세기 1:40/ })).toBeVisible();
});

test("fuzzy search selects through chooseVerse and records one history entry", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  const input = page.getByRole("searchbox", { name: "Search active Bible text" });
  await expect(input).toBeFocused();
  await input.fill("Mathew chapter 2 verse 5");
  const result = page.locator(".search-results button").filter({ hasText: /Matthew 2:5/ });
  await expect(result).toContainText("English");
  await result.click();
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect(page.locator("#verse-2-5")).toBeInViewport();
  await expect(page.locator(".floating-dock")).toHaveClass(/is-hidden/);
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);

  await revealDock(page);
  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.getByRole("button", { name: /^Matthew 2:5/ })).toBeVisible();
  await expect(page.locator(".history-list > li")).toHaveCount(1);
});

test("records, reuses, removes, and clears bounded search history", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  const input = page.getByRole("searchbox", { name: "Search active Bible text" });
  await input.fill("Bar-Jesus");
  await input.press("Enter");
  await input.fill("");
  const recent = page.getByRole("button", { name: "Bar-Jesus", exact: true });
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(input).toHaveValue("Bar-Jesus");
  await input.fill("");
  await page.getByRole("button", { name: "Remove Bar-Jesus from search history" }).click();
  await expect(recent).toHaveCount(0);

  await input.fill("Matthew");
  await input.press("Enter");
  await input.fill("");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear All", exact: true }).click();
  await expect(page.getByText("Search the active text")).toBeVisible();
});

test("focuses search when opening it directly or switching from another sheet", async ({ page }) => {
  const search = page.getByRole("searchbox", { name: "Search active Bible text" });
  await page.getByRole("button", { name: "Search" }).click();
  await expect(search).toBeFocused();
  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.locator(".overlay-close")).toBeFocused();
  await page.getByRole("button", { name: "Search" }).click();
  await expect(search).toBeFocused();
});

test("search joins punctuation within names without joining separate words", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  const input = page.getByRole("searchbox", { name: "Search active Bible text" });
  await input.fill("barjesus");
  const result = page.locator(".search-results button").filter({ hasText: /Acts 13:6/ });
  await expect(result).toContainText("Bar-Jesus");
  await input.fill("bar jesus");
  await expect(result).toContainText("Bar-Jesus");
});

test("search queries only languages active in Profile", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  const input = page.getByRole("searchbox", { name: "Search active Bible text" });
  await input.fill("한국어 시험");
  await expect(page.getByText("No matching verses")).toBeVisible();
  await page.locator(".overlay-close").click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await page.getByRole("combobox", { name: "Secondary language" }).selectOption("ko");
  await page.locator(".overlay-close").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("button", { name: /^창세기 1:1 Korean / })).toBeVisible();
});

test("history remains global and routes an inactive language without duplication", async ({ page }) => {
  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  await page.locator('section[aria-labelledby="verses-title"] button').filter({ hasText: /^50$/ }).click();
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await page.getByRole("combobox", { name: "Primary language" }).selectOption("ko");
  await page.locator(".overlay-close").click();
  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  await page.locator('section[aria-labelledby="verses-title"] button').filter({ hasText: /^40$/ }).click();

  await page.getByRole("button", { name: "Reading history" }).click();
  const englishHistory = page.getByRole("button", { name: /^Genesis 1:50/ });
  const koreanHistory = page.getByRole("button", { name: /^창세기 1:40/ });
  await expect(englishHistory).toBeVisible();
  await expect(koreanHistory).toBeVisible();
  await expect(englishHistory.locator(".history-preview")).toHaveText("Verse 50 text for browser testing.");
  await expect(koreanHistory.locator(".history-preview")).toContainText("한국어 시험 구절 40");
  await englishHistory.click();
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.locator(".history-list > li")).toHaveCount(2);
});

test("history keeps a saved location selectable when its preview dataset is unavailable", async ({ page }) => {
  await page.route("**/data/bible-missing.json", (route) => route.fulfill({ status: 404 }));
  await page.evaluate(() => localStorage.setItem("awmpc-bible.history.v1", JSON.stringify([{
    id: "missing-preview",
    bibleLanguage: "missing",
    book: "Unavailable",
    chapter: "1",
    verse: "1",
    visitedAt: "2026-08-14T00:00:00.000Z",
  }])));
  await page.reload();
  await page.getByRole("button", { name: "Reading history" }).click();
  const missingHistory = page.getByRole("button", { name: /^Unavailable 1:1/ });
  await expect(missingHistory).toBeVisible();
  await expect(missingHistory.locator(".history-preview")).toHaveCount(0);
  await expect(missingHistory.locator(".history-preview-skeleton")).toHaveCount(0);
});

test("history shows a compact placeholder while a preview dataset loads", async ({ page }) => {
  await page.route("**/data/bible-delayed.json", async (route) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ json: { Delayed: { "1": { "1": "Loaded after the preview placeholder." } } } });
  });
  await page.evaluate(() => localStorage.setItem("awmpc-bible.history.v1", JSON.stringify([{
    id: "delayed-preview",
    bibleLanguage: "delayed",
    book: "Delayed",
    chapter: "1",
    verse: "1",
    visitedAt: "2026-08-14T00:00:00.000Z",
  }])));
  await page.reload();
  await page.getByRole("button", { name: "Reading history" }).click();
  const delayedHistory = page.getByRole("button", { name: /^Delayed 1:1/ });
  await expect(delayedHistory.locator(".history-preview-skeleton")).toBeVisible();
  await expect(delayedHistory.locator(".history-preview")).toHaveText("Loaded after the preview placeholder.");
});

test("repeated trackpad gestures switch adjacent chapters without pointer movement and preserve vertical scrolling", async ({ page }) => {
  const pane = page.locator(".reading-pane");
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await page.getByRole("combobox", { name: "Secondary language" }).selectOption("ko");
  await page.locator(".overlay-close").click();
  await pane.hover({ position: { x: 320, y: 220 } });

  await page.mouse.wheel(40, 2);
  await page.mouse.wheel(45, 2);
  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await expect(page.locator("#verse-1-1 .verse-language-row")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Choose book, currently Matthew, 마태복음" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(pane).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(520);

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect(pane).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(520);

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 3"]')).toBeVisible();
  await expect(pane).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(520);

  await page.mouse.wheel(-80, 2);
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect(pane).not.toHaveAttribute("aria-busy", "true");

  const beforeVertical = await page.evaluate(() => scrollY);
  await page.mouse.wheel(2, 500);
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect.poll(() => page.evaluate((before) => scrollY > before, beforeVertical)).toBe(true);

  await page.waitForTimeout(520);
  await page.mouse.wheel(-90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
});

test("one horizontal trackpad gesture cannot advance twice after its first chapter render", async ({ page }) => {
  const pane = page.locator(".reading-pane");
  await pane.hover({ position: { x: 320, y: 220 } });

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await page.waitForTimeout(80);
  await page.mouse.wheel(90, 1);
  await page.waitForTimeout(300);

  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeHidden();
});

test("vertical scrolling does not keep the horizontal swipe lock alive", async ({ page }) => {
  const pane = page.locator(".reading-pane");
  await pane.hover({ position: { x: 320, y: 220 } });

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(300);
  await page.mouse.wheel(90, 1);

  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
});

test("an ignored horizontal retry does not extend the chapter-swipe lock", async ({ page }) => {
  const pane = page.locator(".reading-pane");
  await pane.hover({ position: { x: 320, y: 220 } });

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await page.waitForTimeout(80);
  await page.mouse.wheel(90, 1);
  await page.waitForTimeout(350);
  await page.mouse.wheel(90, 1);

  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
});

test("trusted mobile swipes switch chapters while vertical touch movement remains native", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  const box = await page.locator(".reading-pane").boundingBox();
  if (!box) throw new Error("Reading pane geometry is unavailable.");
  const y = box.y + Math.min(240, box.height / 2);
  const startX = box.x + box.width * .8;
  const endX = box.x + box.width * .2;
  const point = (x: number, currentY = y) => ({ x, y: currentY, id: 1, radiusX: 1, radiusY: 1, force: 1 });

  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(startX)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point((startX + endX) / 2)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(endX)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();

  const beforeVertical = await page.evaluate(() => scrollY);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(endX, y + 180)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(endX + 4, y)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
  await expect.poll(() => page.evaluate((before) => scrollY > before, beforeVertical)).toBe(true);
});

test("top reading controls target navigation sections without a reader header", async ({ page }) => {
  const book = page.getByRole("button", { name: "Choose book, currently Genesis" });
  const chapter = page.getByRole("button", { name: "Choose chapter, currently chapter 1" });
  await expect(book).toHaveText("Genesis");
  await expect(chapter).toHaveText("Chapter 1");
  await expect(page.locator(".reading-header")).toHaveCount(0);

  await book.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".overlay-close")).toBeFocused();
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);
  await expect(page.locator(".floating-dock")).not.toHaveClass(/is-hidden/);
  await expect(page.locator('section[aria-labelledby="books-title"] button[aria-current="page"]')).toBeInViewport();
  await expect(page.locator(".reading-location-controls")).toHaveAttribute("inert", "");
  await expect(page.locator(".reading-location-controls")).toHaveAttribute("aria-hidden", "true");
  await page.locator(".overlay-close").click();
  await expect(page.locator(".reading-location-controls")).not.toHaveClass(/is-hidden/);
  await expect(book).toBeFocused();

  await chapter.click();
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);
  await expect(page.locator(".floating-dock")).not.toHaveClass(/is-hidden/);
  const content = page.locator(".overlay-content");
  const selectedChapter = page.locator('section[aria-labelledby="chapters-title"] button[aria-current="page"]');
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(1000);
  await expect(selectedChapter).toBeInViewport();
  await page.locator(".overlay-close").click();
  await expect(page.locator(".reading-location-controls")).not.toHaveClass(/is-hidden/);
  await expect(chapter).toBeFocused();
});

test("top reading controls and bottom dock share hide and tap visibility", async ({ page }) => {
  const controls = page.locator(".reading-location-controls");
  const dock = page.locator(".floating-dock");
  await page.mouse.wheel(0, 700);
  await expect(controls).toHaveClass(/is-hidden/);
  await expect(dock).toHaveClass(/is-hidden/);

  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(controls).not.toHaveClass(/is-hidden/);
  await expect(dock).not.toHaveClass(/is-hidden/);
  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(controls).toHaveClass(/is-hidden/);
  await expect(dock).toHaveClass(/is-hidden/);

  await page.mouse.wheel(0, -700);
  await expect(controls).toHaveClass(/is-hidden/);
  await expect(dock).toHaveClass(/is-hidden/);

  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(controls).not.toHaveClass(/is-hidden/);
  await expect(dock).not.toHaveClass(/is-hidden/);
});

test("profile shade close does not keep a focused dock visible after scrolling", async ({ page }) => {
  const dock = page.locator(".floating-dock");
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await page.getByRole("combobox", { name: "Secondary language" }).selectOption("ko");
  await page.locator(".overlay-shade").click({ position: { x: 16, y: 16 } });
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Profile and preferences" })).toBeFocused();
  await page.mouse.wheel(0, 700);
  await expect(dock).toHaveClass(/is-hidden/);
  await expect(dock).toHaveCSS("opacity", "0");
});

test("top navigation shade close does not keep a focused location control visible after scrolling", async ({ page }) => {
  const controls = page.locator(".reading-location-controls");
  await page.getByRole("button", { name: /Choose book, currently Genesis/ }).click();
  await page.locator(".overlay-shade").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.mouse.wheel(0, 700);
  await expect(controls).toHaveClass(/is-hidden/);
  await expect(page.locator(".book-location-button")).toHaveCSS("opacity", "0");
});

test("top navigation resumes shared auto-hide after selecting a verse", async ({ page }) => {
  await page.getByRole("button", { name: /Choose book, currently Genesis/ }).click();
  await page.getByRole("button", { name: "50", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.mouse.wheel(0, 700);
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);
  await expect(page.locator(".floating-dock")).toHaveClass(/is-hidden/);
});

test("dock navigation resumes shared auto-hide after selecting a verse", async ({ page }) => {
  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  await page.getByRole("button", { name: "50", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.mouse.wheel(0, 700);
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);
  await expect(page.locator(".floating-dock")).toHaveClass(/is-hidden/);
});

test("switches and closes overlays without moving the reader", async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500);
  const before = await page.evaluate(() => window.scrollY);

  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".overlay-close")).toBeFocused();
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByText("Profile overlay open", { exact: true })).toHaveText("Profile overlay open");
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("selecting a verse centers it and records one removable history entry", async ({ page }) => {
  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  await page.getByRole("button", { name: "50", exact: true }).click();
  const verse = page.locator("#verse-1-50");
  await expect(verse).toBeInViewport({ ratio: 1 });
  await expect(verse).toHaveClass(/verse-selected-indicator/);
  await expect(verse).not.toHaveClass(/verse-selected-glow/);
  const indicatorEdges = await verse.evaluate((element) => ({
    afterWidth: Number.parseFloat(getComputedStyle(element, "::after").width),
    beforeWidth: Number.parseFloat(getComputedStyle(element, "::before").width),
    leftOffset: Number.parseFloat(getComputedStyle(element, "::before").left),
    rightOffset: Number.parseFloat(getComputedStyle(element, "::after").right),
  }));
  expect(indicatorEdges.beforeWidth).toBeGreaterThan(0);
  expect(indicatorEdges.afterWidth).toBeGreaterThan(0);
  expect(indicatorEdges.leftOffset).toBeLessThan(0);
  expect(indicatorEdges.rightOffset).toBeLessThan(0);

  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.getByRole("button", { name: /^Genesis 1:50/ })).toBeVisible();
  await page.getByRole("button", { name: "Remove Genesis 1:50 (en) from history" }).click();
  await expect(page.getByText("No reading history yet")).toBeVisible();
});

test("verse number actions copy plain text and a loadable centered link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#verse-1-40").scrollIntoViewIfNeeded();
  const trigger = page.getByRole("button", { name: "Actions for verse 40", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Genesis 1:40 actions" });
  const menuElement = page.locator(".verse-actions-menu");
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Copy Link" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(menuElement).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitem", { name: "Copy Verse" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Verse 40 text for browser testing.\n— Genesis 1:40");
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("menuitem", { name: "Copy Link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).searchParams.get("verse")).toBe("40");
  await page.goto(link);
  const linkedVerse = page.locator("#verse-1-40");
  await expect(linkedVerse).toBeInViewport();
  await expect.poll(async () => {
    const box = await linkedVerse.boundingBox();
    return box ? Math.abs(box.y + box.height / 2 - (await page.evaluate(() => innerHeight / 2))) : 999;
  }).toBeLessThan(6);
  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.getByText("No reading history yet")).toBeVisible();
});

test("verse actions remove motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const trigger = page.getByRole("button", { name: "Actions for verse 1", exact: true });
  await trigger.click();
  const menu = page.locator(".verse-actions-menu");
  await expect(menu).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("user book and chapter choices advance the navigation scroll", async ({ page }) => {
  const beforeReaderScroll = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  const content = page.locator(".overlay-content");
  expect(await content.evaluate((element) => element.scrollTop)).toBe(0);

  await page.getByRole("button", { name: "Matthew", exact: true }).click();
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const afterBook = await content.evaluate((element) => element.scrollTop);
  await expect(page.getByRole("heading", { name: "Chapters" })).toBeInViewport();

  await page.locator('section[aria-labelledby="chapters-title"] button').filter({ hasText: /^2$/ }).click();
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(afterBook);
  const versesHeading = page.getByRole("heading", { name: "Verses" });
  await expect(versesHeading).toBeInViewport();
  await expect.poll(async () => {
    const [contentBox, headingBox, scrollState] = await Promise.all([
      content.boundingBox(),
      versesHeading.boundingBox(),
      content.evaluate((element) => ({ top: element.scrollTop, max: element.scrollHeight - element.clientHeight })),
    ]);
    if (!contentBox || !headingBox) return Number.POSITIVE_INFINITY;
    const distanceFromTop = Math.abs(headingBox.y - contentBox.y);
    const distanceFromMaxScroll = Math.abs(scrollState.top - scrollState.max);
    return Math.min(distanceFromTop, distanceFromMaxScroll);
  }).toBeLessThan(2);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeReaderScroll);

  await page.locator('section[aria-labelledby="verses-title"] button').filter({ hasText: /^1$/ }).click();
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await page.getByRole("button", { name: "Choose book, currently Matthew" }).click();
  const selectedBook = page.locator('section[aria-labelledby="books-title"] button[aria-current="page"]');
  await expect(selectedBook).toHaveText("Matthew");
  await expect(selectedBook).toBeInViewport();
  await page.locator(".overlay-close").click();
  await page.getByRole("button", { name: "Choose chapter, currently chapter 2" }).click();
  const selectedChapter = page.locator('section[aria-labelledby="chapters-title"] button[aria-current="page"]');
  await expect(selectedChapter).toHaveText("2");
  await expect(selectedChapter).toBeInViewport();
});

test("toggles inline footnote numbers and their nested card together", async ({ page }) => {
  const toggle = page.locator(".footnotes-toggle").first();
  const marker = page.locator(".footnote-marker-reveal").first();
  const reveal = page.locator(".footnotes-reveal").first();
  await expect(toggle).toHaveAccessibleName("Show footnotes for verse 1");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(marker).toHaveAttribute("aria-hidden", "true");
  await expect(reveal).toHaveAttribute("aria-hidden", "true");
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBe(0);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
  const before = await page.evaluate(() => window.scrollY);

  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Hide footnotes for verse 1");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => marker.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
  const openingMarkerWidth = await marker.evaluate((element) => element.getBoundingClientRect().width);
  const openingCardHeight = await reveal.evaluate((element) => element.getBoundingClientRect().height);
  expect(openingMarkerWidth).toBeGreaterThan(0);
  expect(openingCardHeight).toBeGreaterThan(0);
  await reveal.evaluate((element) => new Promise<void>((resolve) => {
    if (getComputedStyle(element).transitionDuration === "0s") {
      resolve();
      return;
    }
    element.addEventListener("transitionend", () => resolve(), { once: true });
  }));
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(openingMarkerWidth);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(openingCardHeight);
  await expect(page.getByLabel("Footnote 1")).toHaveText("1");
  await expect(page.getByLabel("Footnote 2")).toHaveText("2");
  const card = page.getByRole("complementary", { name: "Footnotes for verse 1" });
  await expect(card).toContainText("First note");
  await expect(card).toContainText("Second note");
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => marker.evaluate((element) => element.getBoundingClientRect().width)).toBe(0);
  await expect.poll(() => reveal.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("removes footnote motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const toggle = page.locator(".footnotes-toggle").first();
  const marker = page.locator(".footnote-marker-reveal").first();
  const reveal = page.locator(".footnotes-reveal").first();
  await toggle.click();
  expect(await marker.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  expect(await reveal.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(0);
});
