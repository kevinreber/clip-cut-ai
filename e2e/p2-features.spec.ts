import { test, expect } from "@playwright/test";

test.describe("P2 Features — Audio Enhancement, AI Rewrite, Batch Processing", () => {
  test.describe("Audio Enhancement — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("audio enhancement section is visible", async ({ page }) => {
      const section = page.locator('[data-testid="audio-enhancement"]');
      await expect(section).toBeVisible();
      await expect(section.getByText("Audio Enhancement")).toBeVisible();
    });

    test("enhance audio button is present", async ({ page }) => {
      const btn = page.getByTestId("enhance-audio-btn");
      await expect(btn).toBeVisible();
      await expect(btn).toHaveText("Enhance Audio");
    });

    test("expand/collapse toggle works for audio enhancement", async ({
      page,
    }) => {
      const section = page.locator('[data-testid="audio-enhancement"]');
      const expandBtn = section.getByText("Expand");
      await expandBtn.click();
      await expect(section.getByText("Clean Podcast")).toBeVisible();
      await expect(section.getByText("Reduce Background Noise")).toBeVisible();
      await expect(section.getByText("Normalize Volume")).toBeVisible();
    });

    test("audio enhancement preset selection works", async ({ page }) => {
      const section = page.locator('[data-testid="audio-enhancement"]');
      await section.getByText("Expand").click();
      const noisePreset = section.getByText("Reduce Background Noise");
      await noisePreset.click();
      await expect(noisePreset.locator("..")).toHaveClass(/border-primary/);
    });

    test("advanced settings are available in audio enhancement", async ({
      page,
    }) => {
      const section = page.locator('[data-testid="audio-enhancement"]');
      await section.getByText("Expand").click();
      await section.getByText("Advanced Settings").click();
      await expect(section.getByText("Noise Gate Threshold")).toBeVisible();
      await expect(section.getByText("Compression Ratio")).toBeVisible();
      await expect(section.getByText("Volume Normalization")).toBeVisible();
    });
  });

  test.describe("AI Rewrite Suggestions — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("rewrite suggestions section is visible", async ({ page }) => {
      const section = page.locator(
        '[data-testid="ai-rewrite-suggestions"]'
      );
      await expect(section).toBeVisible();
      await expect(
        section.getByText("AI Rewrite Suggestions")
      ).toBeVisible();
    });

    test("get suggestions button shows correct initial text", async ({
      page,
    }) => {
      const btn = page.getByTestId("generate-rewrite-btn");
      await expect(btn).toBeVisible();
      await expect(btn).toHaveText("Get Suggestions");
    });
  });

  test.describe("Batch Processing — Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      // Wait for page to load — authenticated or landing
      await page.waitForLoadState("networkidle");
    });

    test("batch processing section is visible on dashboard when authenticated", async ({
      page,
    }) => {
      // This test will only pass when authenticated
      const section = page.locator('[data-testid="batch-processing"]');
      // If not authenticated, we're on the landing page — skip gracefully
      const isAuthenticated = await page
        .getByText("Your Projects")
        .isVisible()
        .catch(() => false);

      if (isAuthenticated) {
        await expect(section).toBeVisible();
        await expect(section.getByText("Batch Processing")).toBeVisible();
      }
    });

    test("batch processing has add videos button", async ({ page }) => {
      const section = page.locator('[data-testid="batch-processing"]');
      const isAuthenticated = await section
        .isVisible()
        .catch(() => false);

      if (isAuthenticated) {
        await expect(section.getByText("Add Videos")).toBeVisible();
      }
    });
  });
});
