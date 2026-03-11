import { test, expect } from "@playwright/test";

test.describe("Tier 3 Features — Multi-Track Timeline, TTS Gap Filler, AI Zoom/Reframe", () => {
  test.describe("Multi-Track Timeline — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("multi-track timeline section is visible", async ({ page }) => {
      const section = page.locator('[data-testid="multi-track-timeline"]');
      await expect(section).toBeVisible();
      await expect(section.getByText("Multi-Track Timeline")).toBeVisible();
    });

    test("shows track count badge", async ({ page }) => {
      const section = page.locator('[data-testid="multi-track-timeline"]');
      await expect(section.getByText("0 tracks")).toBeVisible();
    });

    test("expand toggle reveals timeline controls", async ({ page }) => {
      const toggle = page.getByTestId("multi-track-toggle");
      await toggle.click();
      await expect(page.getByTestId("add-track-btn")).toBeVisible();
    });

    test("add track menu shows all track types", async ({ page }) => {
      await page.getByTestId("multi-track-toggle").click();
      await page.getByTestId("add-track-btn").click();
      await expect(page.getByTestId("add-track-video")).toBeVisible();
      await expect(page.getByTestId("add-track-audio")).toBeVisible();
      await expect(page.getByTestId("add-track-image")).toBeVisible();
      await expect(page.getByTestId("add-track-text")).toBeVisible();
    });

    test("adding a track updates the track count", async ({ page }) => {
      const section = page.locator('[data-testid="multi-track-timeline"]');
      await page.getByTestId("multi-track-toggle").click();
      await page.getByTestId("add-track-btn").click();
      await page.getByTestId("add-track-audio").click();
      await expect(section.getByText("1 track")).toBeVisible();
    });

    test("selecting a track shows track properties", async ({ page }) => {
      await page.getByTestId("multi-track-toggle").click();
      await page.getByTestId("add-track-btn").click();
      await page.getByTestId("add-track-text").click();
      await expect(page.getByTestId("track-properties")).toBeVisible();
    });

    test("delete track button removes selected track", async ({ page }) => {
      const section = page.locator('[data-testid="multi-track-timeline"]');
      await page.getByTestId("multi-track-toggle").click();
      await page.getByTestId("add-track-btn").click();
      await page.getByTestId("add-track-audio").click();
      await expect(section.getByText("1 track")).toBeVisible();
      await page.getByTestId("delete-track-btn").click();
      await expect(section.getByText("0 tracks")).toBeVisible();
    });
  });

  test.describe("TTS Gap Filler — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("tts gap filler section is visible", async ({ page }) => {
      const section = page.locator('[data-testid="tts-gap-filler"]');
      await expect(section).toBeVisible();
      await expect(section.getByText("TTS Gap Filler")).toBeVisible();
    });

    test("shows segment count badge", async ({ page }) => {
      const section = page.locator('[data-testid="tts-gap-filler"]');
      await expect(section.getByText("0 segments")).toBeVisible();
    });

    test("expand toggle reveals voice selector and controls", async ({ page }) => {
      await page.getByTestId("tts-gap-filler-toggle").click();
      await expect(page.getByTestId("voice-selector")).toBeVisible();
      await expect(page.getByTestId("suggest-gaps-btn")).toBeVisible();
    });

    test("voice selector shows all OpenAI voices", async ({ page }) => {
      await page.getByTestId("tts-gap-filler-toggle").click();
      const voiceSelector = page.getByTestId("voice-selector");
      await expect(voiceSelector.getByText("Alloy")).toBeVisible();
      await expect(voiceSelector.getByText("Echo")).toBeVisible();
      await expect(voiceSelector.getByText("Nova")).toBeVisible();
      await expect(voiceSelector.getByText("Onyx")).toBeVisible();
      await expect(voiceSelector.getByText("Fable")).toBeVisible();
      await expect(voiceSelector.getByText("Shimmer")).toBeVisible();
    });

    test("voice selection changes selected voice", async ({ page }) => {
      await page.getByTestId("tts-gap-filler-toggle").click();
      const echoBtn = page.getByTestId("voice-echo");
      await echoBtn.click();
      await expect(echoBtn).toHaveClass(/bg-primary/);
    });
  });

  test.describe("AI Zoom / Reframe — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("ai zoom reframe section is visible", async ({ page }) => {
      const section = page.locator('[data-testid="ai-zoom-reframe"]');
      await expect(section).toBeVisible();
      await expect(section.getByText("AI Zoom / Reframe")).toBeVisible();
    });

    test("shows region count badge", async ({ page }) => {
      const section = page.locator('[data-testid="ai-zoom-reframe"]');
      await expect(section.getByText("0 regions")).toBeVisible();
    });

    test("expand toggle reveals controls", async ({ page }) => {
      await page.getByTestId("ai-zoom-reframe-toggle").click();
      await expect(page.getByTestId("aspect-ratio-selector")).toBeVisible();
      await expect(page.getByTestId("auto-detect-zoom-btn")).toBeVisible();
      await expect(page.getByTestId("add-zoom-region-btn")).toBeVisible();
    });

    test("aspect ratio selector shows all options", async ({ page }) => {
      await page.getByTestId("ai-zoom-reframe-toggle").click();
      const selector = page.getByTestId("aspect-ratio-selector");
      await expect(selector.getByText("16:9")).toBeVisible();
      await expect(selector.getByText("9:16")).toBeVisible();
      await expect(selector.getByText("1:1")).toBeVisible();
      await expect(selector.getByText("4:5")).toBeVisible();
    });

    test("aspect ratio selection works", async ({ page }) => {
      await page.getByTestId("ai-zoom-reframe-toggle").click();
      const squareBtn = page.getByTestId("aspect-1-1");
      await squareBtn.click();
      await expect(squareBtn).toHaveClass(/bg-primary/);
    });

    test("manual region add works", async ({ page }) => {
      const section = page.locator('[data-testid="ai-zoom-reframe"]');
      await page.getByTestId("ai-zoom-reframe-toggle").click();
      await page.getByTestId("add-zoom-region-btn").click();
      await expect(section.getByText("1 region")).toBeVisible();
      await expect(page.getByTestId("zoom-regions-list")).toBeVisible();
    });

    test("live preview toggle works", async ({ page }) => {
      await page.getByTestId("ai-zoom-reframe-toggle").click();
      const previewBtn = page.getByTestId("toggle-zoom-preview");
      await expect(previewBtn).toHaveText("Live Preview");
      await previewBtn.click();
      await expect(previewBtn).toHaveText("Hide Preview");
    });
  });
});
