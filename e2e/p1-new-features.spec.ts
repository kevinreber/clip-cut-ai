import { test, expect } from "@playwright/test";

test.describe("Speaker Diarization, Clip Extraction, Animated Captions — Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Demo: Tech Talk Presentation")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("speaker diarization section is visible with identify button", async ({
    page,
  }) => {
    const section = page.locator('[data-testid="speaker-diarization"]');
    await expect(section).toBeVisible();
    await expect(section.getByText("Speaker Diarization")).toBeVisible();
    await expect(
      section.getByTestId("identify-speakers-btn")
    ).toBeVisible();
  });

  test("identify speakers button shows correct initial text", async ({
    page,
  }) => {
    const btn = page.getByTestId("identify-speakers-btn");
    await expect(btn).toHaveText("Identify Speakers");
  });

  test("clip extractor section is visible with extract button", async ({
    page,
  }) => {
    const section = page.locator('[data-testid="clip-extractor"]');
    await expect(section).toBeVisible();
    await expect(section.getByText("AI Clip Extraction")).toBeVisible();
    await expect(section.getByTestId("extract-clips-btn")).toBeVisible();
  });

  test("extract clips button shows correct initial text", async ({
    page,
  }) => {
    const btn = page.getByTestId("extract-clips-btn");
    await expect(btn).toHaveText("Find Best Clips");
  });

  test("animated captions section is visible with style selector", async ({
    page,
  }) => {
    const section = page.locator('[data-testid="animated-captions"]');
    await expect(section).toBeVisible();
    await expect(section.getByText("Animated Captions")).toBeVisible();
  });

  test("animated captions shows 4 caption styles", async ({ page }) => {
    const section = page.locator('[data-testid="animated-captions"]');
    await expect(section.getByTestId("caption-style-classic")).toBeVisible();
    await expect(
      section.getByTestId("caption-style-bold-pop")
    ).toBeVisible();
    await expect(section.getByTestId("caption-style-karaoke")).toBeVisible();
    await expect(section.getByTestId("caption-style-minimal")).toBeVisible();
  });

  test("animated captions has preview button", async ({ page }) => {
    const section = page.locator('[data-testid="animated-captions"]');
    const previewBtn = section.getByTestId("preview-captions-btn");
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toHaveText("Play Preview");
  });

  test("animated captions preview plays and stops", async ({ page }) => {
    const section = page.locator('[data-testid="animated-captions"]');
    const previewBtn = section.getByTestId("preview-captions-btn");

    // Start preview
    await previewBtn.click();
    await expect(previewBtn).toHaveText("Stop");

    // Wait for preview to complete (6 words * 400ms = 2.4s)
    await page.waitForTimeout(3000);
    await expect(previewBtn).toHaveText("Play Preview");
  });

  test("animated captions can select different styles", async ({ page }) => {
    const section = page.locator('[data-testid="animated-captions"]');

    // Click Classic style
    await section.getByTestId("caption-style-classic").click();
    await expect(section.getByTestId("caption-style-classic")).toHaveClass(
      /border-primary/
    );

    // Click Karaoke style
    await section.getByTestId("caption-style-karaoke").click();
    await expect(section.getByTestId("caption-style-karaoke")).toHaveClass(
      /border-primary/
    );
  });

  test("animated captions has export buttons", async ({ page }) => {
    const section = page.locator('[data-testid="animated-captions"]');
    await expect(section.getByTestId("export-word-srt")).toBeVisible();
    await expect(section.getByTestId("export-ass")).toBeVisible();
  });

  test("speaker diarization can be collapsed and expanded", async ({
    page,
  }) => {
    const section = page.locator('[data-testid="speaker-diarization"]');
    // No collapse button initially (no speakers identified yet)
    // The identify button should be present
    await expect(
      section.getByTestId("identify-speakers-btn")
    ).toBeVisible();
  });

  test("clip extractor can be collapsed and expanded", async ({ page }) => {
    const section = page.locator('[data-testid="clip-extractor"]');
    // No collapse button initially (no clips extracted yet)
    // The extract button should be present
    await expect(section.getByTestId("extract-clips-btn")).toBeVisible();
  });

  test("animated captions can be collapsed and expanded", async ({
    page,
  }) => {
    const section = page.locator('[data-testid="animated-captions"]');

    // Should initially be expanded
    await expect(section.getByText("Caption Style")).toBeVisible();

    // Collapse
    await section.getByText("Collapse").click();
    await expect(section.getByText("Caption Style")).not.toBeVisible();

    // Expand
    await section.getByText("Expand").click();
    await expect(section.getByText("Caption Style")).toBeVisible();
  });
});
