import { test, expect } from "@playwright/test";

test.describe("Content Repurposing — Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Demo: Tech Talk Presentation")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("content repurpose section is visible", async ({ page }) => {
    const section = page.locator('[data-testid="content-repurpose"]');
    await expect(section).toBeVisible();
    await expect(section.getByText("Content Repurposing")).toBeVisible();
  });

  test("repurpose button shows correct initial text", async ({ page }) => {
    const btn = page.getByTestId("repurpose-btn");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText("Repurpose Content");
  });

  test("clicking repurpose shows info toast in demo mode", async ({
    page,
  }) => {
    const btn = page.getByTestId("repurpose-btn");
    await btn.click();
    await expect(
      page.getByText("Content repurposing requires a project with an API key.")
    ).toBeVisible({ timeout: 5_000 });
  });
});
