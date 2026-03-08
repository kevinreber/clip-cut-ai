import { test, expect } from "@playwright/test";
import { signUp, uploadTestVideo } from "./helpers";

test.describe("Project Editor", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test("navigates to project page after upload", async ({ page }) => {
    await uploadTestVideo(page);
    // Should navigate to /project/<id>
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });
  });

  test("shows project header with back button", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    // Back button
    await expect(page.getByText("Back").or(page.getByText("\u2190"))).toBeVisible();
  });

  test("shows project status badge", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    // Status badge should be visible (uploading, analyzing, or ready)
    const status = page.locator('[class*="rounded-full"]').first();
    await expect(status).toBeVisible();
  });

  test("shows playback controls when video is present", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    // Wait for video or "no video" message
    const videoEl = page.locator("video");
    const noVideo = page.getByText("No video uploaded yet");
    await expect(videoEl.or(noVideo)).toBeVisible({ timeout: 10_000 });

    if (await videoEl.isVisible()) {
      // Should have playback controls
      await expect(
        page.getByRole("button", { name: "Play" })
      ).toBeVisible();

      // Speed buttons
      await expect(page.getByRole("button", { name: "1x" })).toBeVisible();
      await expect(page.getByRole("button", { name: "2x" })).toBeVisible();

      // Shortcut help button
      await expect(page.getByRole("button", { name: "?" })).toBeVisible();
    }
  });

  test("shows transcript panel with instructions", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    await expect(page.getByText("Transcript")).toBeVisible();
    // Should show either "Analyze your video" or transcript content
    const analyzeHint = page.getByText("Analyze your video");
    const transcriptContent = page.locator(".flex.flex-wrap.gap-1");
    await expect(
      analyzeHint.or(transcriptContent)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("keyboard shortcuts modal opens with ? button", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Click the ? button if visible, or press ? key
    const helpBtn = page.getByRole("button", { name: "?" });
    if (await helpBtn.isVisible()) {
      await helpBtn.click();
    } else {
      await page.keyboard.press("?");
    }

    // Modal should open
    await expect(page.getByText("Keyboard Shortcuts")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Play / Pause")).toBeVisible();
    await expect(page.getByText("Toggle preview mode")).toBeVisible();
    await expect(page.getByText("Mute / Unmute")).toBeVisible();
    await expect(page.getByText("Slow down / Speed up")).toBeVisible();

    // Close modal by clicking backdrop
    await page.locator(".fixed.inset-0").click({ position: { x: 10, y: 10 } });
    await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible();
  });

  test("shows legend with word types", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    await expect(page.getByText("Filler/Repetition")).toBeVisible();
    await expect(page.getByText("Silence")).toBeVisible();
    await expect(page.getByText("Deleted")).toBeVisible();
    await expect(page.getByText("Current")).toBeVisible();
  });

  test("back button navigates to dashboard", async ({ page }) => {
    await uploadTestVideo(page);
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    // Click back link
    await page.getByText("\u2190").first().click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("project name is displayed and double-clickable", async ({ page }) => {
    await uploadTestVideo(page, "rename-test-video.mp4");
    await expect(page).toHaveURL(/\/project\//, { timeout: 15_000 });

    // Project name should be visible
    const projectTitle = page.locator("h1");
    await expect(projectTitle).toContainText("rename-test-video");

    // Double click should activate rename
    await projectTitle.dblclick();
    const renameInput = page.locator(
      'input[class*="border-primary"]'
    );
    await expect(renameInput).toBeVisible({ timeout: 3_000 });

    // Escape should cancel
    await page.keyboard.press("Escape");
    await expect(renameInput).not.toBeVisible();
  });
});
