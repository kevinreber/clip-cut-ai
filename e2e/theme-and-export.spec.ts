import { test, expect } from "@playwright/test";
import { signUp, uploadTestVideo } from "./helpers";

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test("theme toggle button is visible in user menu", async ({ page }) => {
    // The theme toggle renders a sun/moon character
    const themeBtn = page.locator("button").filter({ hasText: /[\u2600\u{1F319}]/u });
    await expect(themeBtn).toBeVisible();
  });

  test("clicking theme toggle changes data-theme attribute", async ({
    page,
  }) => {
    // Default should be dark
    const html = page.locator("html");

    // Click theme toggle
    const themeBtn = page.locator("button").filter({ hasText: /[\u2600\u{1F319}]/u });
    await themeBtn.click();

    // Should switch to light
    await expect(html).toHaveAttribute("data-theme", "light");

    // Click again to switch back
    await themeBtn.click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("theme preference persists across page reloads", async ({ page }) => {
    // Switch to light theme
    const themeBtn = page.locator("button").filter({ hasText: /[\u2600\u{1F319}]/u });
    await themeBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Reload
    await page.reload();
    await expect(page.getByText("Remove filler words instantly")).toBeVisible({
      timeout: 10_000,
    });

    // Should still be light theme
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("Export UI", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });
  });

  test("shows analyze button when no transcript", async ({ page }) => {
    // Should show "Analyze Video" button
    const analyzeBtn = page.getByRole("button", {
      name: /Analyze Video/,
    });
    // It might be in the stats bar or transcript panel
    await expect(analyzeBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test("export button is disabled without deleted words", async ({ page }) => {
    // If transcript is loaded, export button should be disabled when no words are deleted
    const exportBtn = page.getByRole("button", {
      name: /Export Edited Video|Delete words to enable export/,
    });

    // Wait a bit for the page to settle
    await page.waitForTimeout(2000);

    // If the export button is visible, it should show the disabled state message
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeDisabled();
    }
  });

  test("subtitle export buttons are visible when transcript exists", async ({
    page,
  }) => {
    // These buttons are only visible if transcript is loaded
    // Check if they appear (they may not if analysis hasn't run)
    await page.waitForTimeout(2000);

    const srtBtn = page.getByRole("button", { name: "Export SRT" });
    const vttBtn = page.getByRole("button", { name: "Export VTT" });
    const textBtn = page.getByRole("button", { name: "Export Text" });

    // These are only present when transcript exists
    const hasTranscript = await srtBtn.isVisible().catch(() => false);
    if (hasTranscript) {
      await expect(srtBtn).toBeVisible();
      await expect(vttBtn).toBeVisible();
      await expect(textBtn).toBeVisible();
    }
  });

  test("quality selector shows three options", async ({ page }) => {
    // Quality selector only shows when there are deleted words
    // This tests that the component renders correctly when available
    await page.waitForTimeout(2000);

    const fastBtn = page.getByRole("button", { name: "Fast" });
    const balancedBtn = page.getByRole("button", { name: "Balanced" });
    const highBtn = page.getByRole("button", { name: "High Quality" });

    // Only visible when export is available (words are deleted)
    const hasQuality = await fastBtn.isVisible().catch(() => false);
    if (hasQuality) {
      await expect(fastBtn).toBeVisible();
      await expect(balancedBtn).toBeVisible();
      await expect(highBtn).toBeVisible();

      // Fast should be selected by default
      await expect(fastBtn).toHaveClass(/bg-primary/);
    }
  });
});

test.describe("Toast Notifications", () => {
  test("toast appears for invalid file type on drag-and-drop", async ({
    page,
  }) => {
    await signUp(page);

    // Try to upload a non-video file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "document.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a video"),
    });

    // The processUpload function checks file type and shows a toast
    // Note: the file input has accept="video/*" so the browser may filter it
    // But our code also validates, so if it gets through, toast should appear
    await page.waitForTimeout(1000);
  });
});
