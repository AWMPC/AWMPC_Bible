import { expect, test } from "@playwright/test";

const dataset = {
  Genesis: {
    "1": Object.fromEntries(Array.from({ length: 80 }, (_, index) => [String(index + 1), index === 0 ? "Verse 1 {First note} text with {Second note} details." : `Verse ${index + 1} text for browser testing.`])),
  },
  Matthew: { "1": { "1": "A New Testament verse." } },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/data/bible-en.json", (route) => route.fulfill({ json: dataset }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Genesis" })).toBeVisible();
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

test("toggles inline footnote numbers and their nested card together", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "footnotes", exact: true });
  const marker = page.locator(".footnote-marker-reveal").first();
  const reveal = page.locator(".footnotes-reveal").first();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
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
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(80);
  const openingMarkerWidth = await marker.evaluate((element) => element.getBoundingClientRect().width);
  const openingCardHeight = await reveal.evaluate((element) => element.getBoundingClientRect().height);
  expect(openingMarkerWidth).toBeGreaterThan(0);
  expect(openingCardHeight).toBeGreaterThan(0);
  await page.waitForTimeout(180);
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(openingMarkerWidth);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(openingCardHeight);
  await expect(page.getByLabel("Footnote 1")).toHaveText("1");
  await expect(page.getByLabel("Footnote 2")).toHaveText("2");
  await expect(page.getByLabel("Footnotes for verse 1")).toContainText("First note");
  await expect(page.getByLabel("Footnotes for verse 1")).toContainText("Second note");
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(80);
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(0);
  await page.waitForTimeout(180);
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBe(0);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("removes footnote motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const toggle = page.getByRole("button", { name: "footnotes", exact: true });
  const marker = page.locator(".footnote-marker-reveal").first();
  const reveal = page.locator(".footnotes-reveal").first();
  await toggle.click();
  expect(await marker.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  expect(await reveal.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  expect(await marker.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(0);
  expect(await reveal.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(0);
});
