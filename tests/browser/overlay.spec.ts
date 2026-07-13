import { expect, test } from "@playwright/test";

const dataset = {
  Genesis: {
    "1": Object.fromEntries(Array.from({ length: 80 }, (_, index) => [String(index + 1), index === 0 ? "Verse 1 {First note} text with {Second note} details." : `Verse ${index + 1} text for browser testing.`])),
  },
  Matthew: Object.fromEntries(Array.from({ length: 20 }, (_, chapterIndex) => [String(chapterIndex + 1), Object.fromEntries(Array.from({ length: 12 }, (_, verseIndex) => [String(verseIndex + 1), `Matthew chapter ${chapterIndex + 1} verse ${verseIndex + 1}.`]))])),
  ...Object.fromEntries(Array.from({ length: 64 }, (_, index) => [`Reference ${index + 1}`, { "1": { "1": `Reference verse ${index + 1}.` } }])),
};

test.beforeEach(async ({ page }) => {
  await page.route("**/data/bible-en.json", (route) => route.fulfill({ json: dataset }));
  await page.goto("/");
  await expect(page.locator('article[aria-label="Genesis chapter 1"]')).toBeVisible();
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
  }
});

test("top reading controls target navigation sections without a reader header", async ({ page }) => {
  const book = page.getByRole("button", { name: "Choose book, currently Genesis" });
  const chapter = page.getByRole("button", { name: "Choose chapter, currently chapter 1" });
  await expect(book).toHaveText("Genesis");
  await expect(chapter).toHaveText("Chapter 1");
  await expect(page.locator(".reading-header")).toHaveCount(0);

  await book.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".reading-location-controls")).toHaveClass(/is-hidden/);
  await expect(page.locator(".floating-dock")).not.toHaveClass(/is-hidden/);
  await expect.poll(() => page.locator(".book-location-button").evaluate((element) => { const rect = element.getBoundingClientRect(); return rect.y + rect.height; })).toBeLessThanOrEqual(0);
  await expect(page.getByRole("heading", { name: "Books", exact: true })).toBeInViewport();
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
  const chaptersHeading = page.getByRole("heading", { name: "Chapters" });
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(1000);
  await expect(chaptersHeading).toBeInViewport();
  await expect.poll(async () => {
    const contentBox = await content.boundingBox();
    const headingBox = await chaptersHeading.boundingBox();
    return contentBox && headingBox ? Math.abs(headingBox.y - contentBox.y) : 999;
  }).toBeLessThan(6);
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
  await page.getByRole("button", { name: "Remove Genesis 1:50 from history" }).click();
  await expect(page.getByText("No reading history yet")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Verses" })).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeReaderScroll);
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
  await page.waitForTimeout(80);
  const openingMarkerWidth = await marker.evaluate((element) => element.getBoundingClientRect().width);
  const openingCardHeight = await reveal.evaluate((element) => element.getBoundingClientRect().height);
  expect(openingMarkerWidth).toBeGreaterThan(0);
  expect(openingCardHeight).toBeGreaterThan(0);
  await page.waitForTimeout(180);
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
