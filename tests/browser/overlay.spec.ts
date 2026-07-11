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
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Footnote 1")).toHaveCount(0);
  await expect(page.getByLabel("Footnotes for verse 1")).toHaveCount(0);
  const before = await page.evaluate(() => window.scrollY);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Footnote 1")).toHaveText("1");
  await expect(page.getByLabel("Footnote 2")).toHaveText("2");
  await expect(page.getByLabel("Footnotes for verse 1")).toContainText("First note");
  await expect(page.getByLabel("Footnotes for verse 1")).toContainText("Second note");
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Footnote 1")).toHaveCount(0);
  await expect(page.getByLabel("Footnotes for verse 1")).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});
