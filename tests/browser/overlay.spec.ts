import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const packageMetadata = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };
const LONG_BOOK_NAME = "ExtraordinarilyLongDemonstrationBookNameThatCannotFitInsideOneNavigationButton";

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

const dataset = {
  Genesis: {
    "1": Object.fromEntries(Array.from({ length: 80 }, (_, index) => [String(index + 1), index === 0 ? "Verse 1 {First note} text with {Second note} details." : `Verse ${index + 1} text for browser testing.`])),
  },
  Matthew: Object.fromEntries(Array.from({ length: 20 }, (_, chapterIndex) => [String(chapterIndex + 1), Object.fromEntries(Array.from({ length: 12 }, (_, verseIndex) => [String(verseIndex + 1), `Matthew chapter ${chapterIndex + 1} verse ${verseIndex + 1}.`]))])),
  Acts: { "13": { "6": "They met a Jewish sorcerer and false prophet named Bar-Jesus." } },
  ...Object.fromEntries(Array.from({ length: 64 }, (_, index) => [index === 63 ? LONG_BOOK_NAME : `Reference ${index + 1}`, { "1": { "1": `Reference verse ${index + 1}.` } }])),
};

const koreanDataset = {
  "창세기": { "1": Object.fromEntries(Array.from({ length: 80 }, (_, index) => [String(index + 1), `한국어 시험 구절 ${index + 1} 본문은 언어별 줄 길이가 달라도 같은 구절을 유지합니다. `.repeat(3).trim()])) },
  "마태복음": Object.fromEntries(Array.from({ length: 20 }, (_, chapterIndex) => [String(chapterIndex + 1), { "1": `마태복음 ${chapterIndex + 1}장 1절.` }])),
};

test.beforeEach(async ({ page }) => {
  await page.route("**/data/bible-en.json", (route) => route.fulfill({ json: dataset }));
  await page.route("**/data/bible-ko.json", (route) => route.fulfill({ json: koreanDataset }));
  await page.goto("/");
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
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
  const anchoredScroll = await page.evaluate(() => scrollY);
  await page.locator(".overlay-close").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await page.evaluate(() => scrollY)).toBe(anchoredScroll);

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

test("shows package semver immediately right of the overlay brand", async ({ page }) => {
  for (const sheet of ["Reading history", "Search", "Navigate books and chapters", "Profile and preferences"]) {
    await page.getByRole("button", { name: sheet }).click();
    await expect(page.locator(".overlay-version")).toBeVisible();
    await expect(page.locator(".overlay-version")).toHaveText(packageMetadata.version);
    await page.locator(".overlay-close").click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const brand = page.locator(".overlay-brand > span").filter({ hasText: /^AWMPC Bible$/ });
  const version = page.locator(".overlay-version");
  await expect(version).toHaveText(packageMetadata.version);
  await expect(version).toHaveAttribute("aria-label", `Version ${packageMetadata.version}`);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const [brandBox, versionBox, closeBox] = await Promise.all([brand.boundingBox(), version.boundingBox(), page.locator(".overlay-close").boundingBox()]);
    expect(brandBox).not.toBeNull();
    expect(versionBox).not.toBeNull();
    expect(closeBox).not.toBeNull();
    expect(versionBox!.x).toBeGreaterThanOrEqual(brandBox!.x + brandBox!.width);
    expect(Math.abs((versionBox!.y + versionBox!.height / 2) - (brandBox!.y + brandBox!.height / 2))).toBeLessThan(3);
    expect(versionBox!.x + versionBox!.width).toBeLessThan(closeBox!.x);
  }
});

test("browser Back closes a dock sheet before leaving the reader", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
});

test("browser Back closes a top navigation sheet before leaving the reader", async ({ page }) => {
  await page.getByRole("button", { name: /Choose book, currently Genesis/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
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

test("sizes sheets to the available area on mobile and right half on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const sheet of ["Reading history", "Search", "Navigate books and chapters", "Profile and preferences"]) {
    await page.getByRole("button", { name: sheet }).click();
    const dialog = page.getByRole("dialog");
    const [dialogBox, dockBox] = await Promise.all([page.getByRole("dialog").boundingBox(), page.locator(".floating-dock").boundingBox()]);
    expect(dialogBox).not.toBeNull();
    expect(dockBox).not.toBeNull();
    const availableHeight = dockBox!.y - 8;
    await expect.poll(async () => {
      const box = await dialog.boundingBox();
      return box ? Math.max(Math.abs(box.x + box.width - 1264), Math.abs(box.y - 16), Math.abs(box.height - (availableHeight - 16))) : Number.POSITIVE_INFINITY;
    }).toBeLessThan(1);
    const settledDialogBox = await dialog.boundingBox();
    expect(settledDialogBox).not.toBeNull();
    expect(settledDialogBox!.width).toBeGreaterThanOrEqual(640);
    expect(settledDialogBox!.width).toBeLessThanOrEqual(1248);
    expect(Math.abs(settledDialogBox!.x + settledDialogBox!.width - 1264)).toBeLessThan(1);
    expect(Math.abs(settledDialogBox!.y - 16)).toBeLessThan(1);
    expect(Math.abs(settledDialogBox!.height - (availableHeight - 16))).toBeLessThan(1);
    expect(settledDialogBox!.height).toBeLessThanOrEqual(availableHeight + 1);
    await page.locator(".overlay-close").click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  const dialog = page.getByRole("dialog");
  const dockBox = await page.locator(".floating-dock").boundingBox();
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box && dockBox ? Math.max(Math.abs(box.x - 16), Math.abs(box.width - 358), Math.abs(box.y - 16), Math.abs(box.y + box.height - (dockBox.y - 8))) : Number.POSITIVE_INFINITY;
  }).toBeLessThan(1);
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(Math.abs(dialogBox!.x - 16)).toBeLessThan(1);
  expect(Math.abs(dialogBox!.width - 358)).toBeLessThan(1);
  expect(Math.abs(dialogBox!.y - 16)).toBeLessThan(1);
  expect(Math.abs(dialogBox!.y + dialogBox!.height - (dockBox!.y - 8))).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const content = page.locator(".overlay-content");
  expect(await content.evaluate((element) => element.scrollHeight)).toBeGreaterThan(await content.evaluate((element) => element.clientHeight));

  const longButton = page.getByRole("button", { name: LONG_BOOK_NAME, exact: true });
  const marquee = longButton.locator(".overflow-marquee");
  await expect(marquee).toHaveAttribute("data-overflow", "true");
  const motion = await marquee.evaluate((element) => {
    const style = getComputedStyle(element);
    const frames = element.firstElementChild?.getAnimations()[0]?.effect?.getKeyframes() ?? [];
    return { distance: Number.parseFloat(style.getPropertyValue("--marquee-distance")), transforms: frames.map(({ transform }) => transform) };
  });
  expect(motion.distance).toBeGreaterThan(0);
  expect(motion.transforms.at(0)).toBe("translateX(0px)");
  expect(motion.transforms.some((transform) => transform !== "translateX(0px)")).toBe(true);
  await expect(page.getByRole("button", { name: "Acts", exact: true }).locator(".overflow-marquee")).not.toHaveAttribute("data-overflow", "true");

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await marquee.locator(".overflow-marquee-track").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("offers only Sans, Serif, and Mono fonts in that order", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const font = page.getByRole("combobox", { name: "Verse font" });
  await expect(font.locator("option")).toHaveText(["Sans", "Serif", "Mono"]);
  await font.selectOption("monospace");
  await expect(page.locator(".awmpc-bible-shell")).toHaveAttribute("data-verse-font", "monospace");
});

test("centers text-scale ticks and labels under every slider snap point", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const slider = page.getByRole("slider", { name: "Verse text size" });
  const labels = ["Compact", "Standard", "Comfortable", "Large", "Extra large"];
  const markers = ["80%", "90%", "100%", "110%", "120%"];
  await expect(page.locator(".scale-mark")).toHaveCount(labels.length);
  await expect(page.locator(".scale-label")).toHaveText(markers);
  await expect(page.locator(".scale-marks")).toHaveAttribute("aria-hidden", "true");

  for (let index = 0; index < labels.length; index += 1) {
    await slider.fill(String(index));
    await expect(slider).toHaveAttribute("aria-valuetext", labels[index]);
    await expect(page.locator(".setting-heading output strong")).toHaveText(labels[index]);
  }

  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width <= 720) {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      const profileGeometry = await page.locator(".profile-panel").evaluate((panel) => {
        const panelRect = panel.getBoundingClientRect();
        const contentRect = panel.closest(".overlay-content")!.getBoundingClientRect();
        return { panelLeft: panelRect.left, panelRight: panelRect.right, contentLeft: contentRect.left, contentRight: contentRect.right };
      });
      expect(profileGeometry.panelLeft).toBeGreaterThanOrEqual(profileGeometry.contentLeft);
      expect(profileGeometry.panelRight).toBeLessThanOrEqual(profileGeometry.contentRight);
    }
    const geometry = await page.locator(".text-scale-control").evaluate((control) => {
      const input = control.querySelector<HTMLInputElement>("input")!;
      const inputRect = input.getBoundingClientRect();
      const thumbSize = Number.parseFloat(getComputedStyle(control).getPropertyValue("--range-thumb-size"));
      return Array.from(control.querySelectorAll<HTMLElement>(".scale-mark")).map((mark, index, marks) => {
        const tick = mark.querySelector<HTMLElement>(".scale-tick")!.getBoundingClientRect();
        const label = mark.querySelector<HTMLElement>(".scale-label")!.getBoundingClientRect();
        const expected = inputRect.left + thumbSize / 2 + index / (marks.length - 1) * (inputRect.width - thumbSize);
        return { expected, tickCenter: tick.left + tick.width / 2, labelCenter: label.left + label.width / 2, labelLeft: label.left, labelRight: label.right };
      });
    });
    for (const mark of geometry) {
      expect(Math.abs(mark.tickCenter - mark.expected)).toBeLessThan(1.1);
      expect(Math.abs(mark.labelCenter - mark.expected)).toBeLessThan(1.1);
      expect(mark.labelLeft).toBeGreaterThanOrEqual(0);
      expect(mark.labelRight).toBeLessThanOrEqual(viewport.width);
    }
    for (let index = 1; index < geometry.length; index += 1) expect(geometry[index].labelLeft).toBeGreaterThan(geometry[index - 1].labelRight);
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

test("search keeps full available geometry while results change", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const searchButton = page.getByRole("button", { name: "Search" });
    if (await searchButton.getAttribute("aria-expanded") !== "true") await searchButton.click();
    const dialog = page.getByRole("dialog");
    const input = page.getByRole("searchbox", { name: "Search active Bible text" });
    const dock = await page.locator(".floating-dock").boundingBox();
    const content = page.locator(".overlay-content");
    const panel = page.locator(".search-panel");
    const expectedWidth = viewport.width <= 720 ? viewport.width - 32 : Math.min(Math.max(viewport.width / 2, 736), viewport.width - 32);
    const expectedRight = viewport.width - 16;
    await expect.poll(async () => {
      const current = await dialog.boundingBox();
      return current ? Math.max(Math.abs(current.x + current.width - expectedRight), Math.abs(current.y - 16), Math.abs(current.width - expectedWidth), Math.abs(current.y + current.height - (dock!.y - 8))) : Number.POSITIVE_INFINITY;
    }).toBeLessThan(1);
    const initial = await dialog.boundingBox();
    expect(initial).not.toBeNull();
    expect(dock).not.toBeNull();
    expect(Math.abs(initial!.x + initial!.width - expectedRight)).toBeLessThan(1);
    expect(Math.abs(initial!.y - 16)).toBeLessThan(1);
    expect(Math.abs(initial!.width - expectedWidth)).toBeLessThan(1);
    expect(Math.abs(initial!.y + initial!.height - (dock!.y - 8))).toBeLessThan(1);
    if (viewport.width <= 720) {
      const [contentBox, panelBox, contentPadding] = await Promise.all([
        content.boundingBox(),
        panel.boundingBox(),
        content.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            top: Number.parseFloat(style.paddingTop),
            right: Number.parseFloat(style.paddingRight),
            bottom: Number.parseFloat(style.paddingBottom),
            left: Number.parseFloat(style.paddingLeft),
          };
        }),
      ]);
      expect(contentBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(Math.abs(panelBox!.x - (contentBox!.x + contentPadding.left))).toBeLessThan(1);
      expect(Math.abs(panelBox!.width - (contentBox!.width - contentPadding.left - contentPadding.right))).toBeLessThan(1);
      expect(panelBox!.height).toBeGreaterThanOrEqual(contentBox!.height - contentPadding.top - contentPadding.bottom - 1);
    }

    for (const query of ["Ma", "Matthew", "Matthew chapter 2 verse 5", "no possible matching verse words"]) {
      await input.fill(query);
      await expect.poll(async () => {
        const current = await dialog.boundingBox();
        return current ? [current.x, current.y, current.width, current.height] : null;
      }).toEqual([initial!.x, initial!.y, initial!.width, initial!.height]);
    }
  }
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
  await expect(page.getByRole("button", { name: /^Genesis 1:50/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^창세기 1:40/ })).toBeVisible();
  await page.getByRole("button", { name: /^Genesis 1:50/ }).click();
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
  await page.getByRole("button", { name: "Reading history" }).click();
  await expect(page.locator(".history-list > li")).toHaveCount(2);
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
  await page.waitForTimeout(220);

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect(pane).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(220);

  await page.mouse.wheel(90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 3"]')).toBeVisible();
  await expect(pane).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(220);

  await page.mouse.wheel(-80, 2);
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect(pane).not.toHaveAttribute("aria-busy", "true");

  const beforeVertical = await page.evaluate(() => scrollY);
  await page.mouse.wheel(2, 500);
  await expect(page.locator('article[aria-label="Matthew chapter 2"]')).toBeVisible();
  await expect.poll(() => page.evaluate((before) => scrollY > before, beforeVertical)).toBe(true);

  await page.waitForTimeout(220);
  await page.mouse.wheel(-90, 1);
  await expect(page.locator('article[aria-label="Matthew chapter 1"]')).toBeVisible();
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

test("first verse begins at the reading pane's normal inset", async ({ page }) => {
  const pane = page.locator(".reading-pane");
  const article = page.locator('article[aria-label="Genesis chapter 1"]');
  const measure = () => page.evaluate(() => {
    const pane = document.querySelector<HTMLElement>(".reading-pane")!;
    const article = document.querySelector<HTMLElement>('.reading-pane > article[aria-label="Genesis chapter 1"]')!;
    const style = getComputedStyle(pane);
    return {
      actual: article.getBoundingClientRect().top - pane.getBoundingClientRect().top,
      expected: Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.paddingTop),
      paddingDifference: Math.abs(Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingLeft)),
    };
  });
  await expect(pane).toBeVisible();
  await expect(article).toBeVisible();
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const geometry = await measure();
    expect(Math.abs(geometry.actual - geometry.expected)).toBeLessThan(1);
    expect(geometry.paddingDifference).toBeLessThan(1);
    const clearance = await page.evaluate(() => {
      const pane = document.querySelector<HTMLElement>(".reading-pane")!.getBoundingClientRect();
      const controls = Array.from(document.querySelectorAll<HTMLElement>(".reading-location-button"), (element) => element.getBoundingClientRect());
      return pane.top - Math.max(...controls.map(({ bottom }) => bottom));
    });
    expect(clearance).toBeGreaterThanOrEqual(15);
    if (viewport.width === 390) {
      const edges = await page.evaluate(() => {
        const pane = document.querySelector<HTMLElement>(".reading-pane")!.getBoundingClientRect();
        const book = document.querySelector<HTMLElement>(".book-location-button")!.getBoundingClientRect();
        const chapter = document.querySelector<HTMLElement>(".chapter-location-button")!.getBoundingClientRect();
        return { paneLeft: pane.left, bookLeft: book.left, paneRight: innerWidth - pane.right, chapterRight: innerWidth - chapter.right };
      });
      expect(Math.abs(edges.paneLeft - edges.bookLeft)).toBeLessThan(1);
      expect(Math.abs(edges.paneRight - edges.chapterRight)).toBeLessThan(1);
    }
  }
});

test("chapter depth changes day and night backgrounds without following overlay scroll", async ({ page }) => {
  const shell = page.locator(".awmpc-bible-shell");
  const progress = () => shell.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue("--chapter-progress")));
  const background = () => shell.evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.locator("html").evaluate((element) => { element.dataset.appearance = "day"; });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(progress).toBe(0);
  const dayStart = await background();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(progress).toBe(1);
  const dayEnd = await background();
  expect(dayEnd).not.toBe(dayStart);

  await page.locator("html").evaluate((element) => { element.dataset.appearance = "night"; });
  const nightEnd = await background();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(progress).toBe(0);
  const nightStart = await background();
  expect(nightEnd).not.toBe(nightStart);
  expect(nightStart).not.toBe(dayStart);
  await expect(shell).toHaveCSS("background-image", "none");

  await page.getByRole("button", { name: "Navigate books and chapters" }).click();
  const beforeOverlayScroll = await progress();
  await page.locator(".overlay-content").evaluate((element) => element.scrollTo({ top: 800 }));
  await expect.poll(progress).toBe(beforeOverlayScroll);
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
  await expect.poll(() => page.locator(".book-location-button").evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.y + rect.height; })).toBeLessThanOrEqual(0);
  await expect(page.locator('section[aria-labelledby="books-title"] button[aria-current="page"]')).toBeInViewport();
  await expect(page.locator(".reading-location-controls")).toHaveAttribute("inert", "");
  await expect(page.locator(".reading-location-controls")).toHaveAttribute("aria-hidden", "true");
  expect(await page.locator(".reading-location-controls").evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeLessThan(await page.getByRole("dialog").evaluate((element) => Number(getComputedStyle(element).zIndex)));
  await page.locator(".overlay-close").click();
  await expect(page.locator(".reading-location-controls")).not.toHaveClass(/is-hidden/);
  await expect(book).toBeFocused();

  await chapter.click();
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);
  await expect(page.locator(".floating-dock")).not.toHaveClass(/is-hidden/);
  await expect.poll(() => page.locator(".chapter-location-button").evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.y + rect.height; })).toBeLessThanOrEqual(0);
  const content = page.locator(".overlay-content");
  const selectedChapter = page.locator('section[aria-labelledby="chapters-title"] button[aria-current="page"]');
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(1000);
  await expect(selectedChapter).toBeInViewport();
  await expect.poll(async () => {
    const contentBox = await content.boundingBox();
    const selectedBox = await selectedChapter.boundingBox();
    return contentBox && selectedBox ? Math.abs(selectedBox.y + selectedBox.height / 2 - (contentBox.y + contentBox.height / 2)) : 999;
  }).toBeLessThan(10);
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
  await expect.poll(() => page.locator(".book-location-button").evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.y + rect.height; })).toBeLessThanOrEqual(0);
  await expect.poll(() => dock.evaluate((element) => element.getBoundingClientRect().y)).toBeGreaterThanOrEqual(await page.evaluate(() => innerHeight));

  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(controls).not.toHaveClass(/is-hidden/);
  await expect(dock).not.toHaveClass(/is-hidden/);
  await page.locator(".reading-pane").click({ position: { x: 300, y: 300 } });
  await expect(controls).toHaveClass(/is-hidden/);
  await expect(dock).toHaveClass(/is-hidden/);
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
  await expect(menuElement).toHaveClass(/is-opening/);
  await expect(menuElement).toHaveCSS("animation-name", "verse-actions-enter");
  await expect(menuElement).toHaveCSS("animation-duration", "0.21s");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Copy Link" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuElement).toHaveClass(/is-closing/);
  await expect(menuElement).toHaveCSS("animation-name", "verse-actions-exit");
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

test("resizes an open overlay with the viewport", async ({ page }) => {
  await page.getByRole("button", { name: "Profile and preferences" }).click();
  const dialog = page.getByRole("dialog");
  const initialHeight = await dialog.evaluate((element) => element.getBoundingClientRect().height);
  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(() => dialog.evaluate((element) => element.getBoundingClientRect().height)).not.toBe(initialHeight);
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
  const verseText = page.locator(".verse-content > p").first();
  const marker = page.locator(".footnote-marker-reveal").first();
  const reveal = page.locator(".footnotes-reveal").first();
  await expect(toggle).toHaveAccessibleName("Show footnotes for verse 1");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveText("");
  await expect(toggle.locator(".footnotes-symbol")).toHaveCount(1);
  const toggleBox = await toggle.boundingBox();
  if (!toggleBox) throw new Error("The footnotes control is not measurable.");
  expect(Math.abs(toggleBox.width - toggleBox.height)).toBeLessThan(0.5);
  expect(Math.abs(toggleBox.height - Number.parseFloat(await verseText.evaluate((element) => getComputedStyle(element).fontSize)))).toBeLessThan(1);
  expect(await toggle.evaluate((element) => getComputedStyle(element).borderWidth)).toBe("0px");
  expect(await toggle.evaluate((element) => element.parentElement?.tagName)).toBe("P");
  expect(await toggle.evaluate((element) => element.parentElement?.lastElementChild === element)).toBe(true);
  await expect(toggle.locator(".footnotes-symbol circle")).toHaveCount(2);
  await expect(toggle.locator(".footnotes-symbol path")).toHaveCount(1);
  await expect(page.locator(".verses > li").nth(1).locator(".footnotes-toggle")).toHaveCount(0);
  await expect(marker).toHaveAttribute("aria-hidden", "true");
  await expect(reveal).toHaveAttribute("aria-hidden", "true");
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBe(0);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
  const before = await page.evaluate(() => window.scrollY);

  const box = await toggle.boundingBox();
  if (!box) throw new Error("The footnotes toggle is not measurable.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => toggle.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
  await page.mouse.move(box.x - 10, box.y - 10);
  await page.mouse.up();

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
  expect(await marker.evaluate((element) => getComputedStyle(element).transitionDuration)).toContain("0.21s");
  expect(await reveal.evaluate((element) => getComputedStyle(element).transitionDuration)).toContain("0.21s");

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
