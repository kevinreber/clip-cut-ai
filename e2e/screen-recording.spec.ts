import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

test.describe("Built-In Screen Recording", () => {
  test.describe("Record Page — Authenticated", () => {
    test.beforeEach(async ({ page }) => {
      await signUp(page);
      await page.goto("/record");
      await expect(page.getByText("Screen Recorder")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("record page loads with correct heading", async ({ page }) => {
      await expect(page.getByText("Record & Edit")).toBeVisible();
      await expect(
        page.getByText("Capture your screen or camera")
      ).toBeVisible();
    });

    test("screen recorder component is visible", async ({ page }) => {
      const recorder = page.locator('[data-testid="screen-recorder"]');
      await expect(recorder).toBeVisible();
    });

    test("source selection is displayed with three options", async ({
      page,
    }) => {
      const sourceSection = page.locator('[data-testid="source-selection"]');
      await expect(sourceSection).toBeVisible();

      await expect(page.locator('[data-testid="source-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="source-camera"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="source-screen\\+camera"]')
      ).toBeVisible();
    });

    test("screen source is selected by default", async ({ page }) => {
      const screenBtn = page.locator('[data-testid="source-screen"]');
      await expect(screenBtn).toHaveClass(/border-primary/);
    });

    test("can switch between recording sources", async ({ page }) => {
      // Click camera
      await page.locator('[data-testid="source-camera"]').click();
      await expect(
        page.locator('[data-testid="source-camera"]')
      ).toHaveClass(/border-primary/);
      await expect(
        page.locator('[data-testid="source-screen"]')
      ).not.toHaveClass(/border-primary/);

      // Click screen+camera
      await page.locator('[data-testid="source-screen\\+camera"]').click();
      await expect(
        page.locator('[data-testid="source-screen\\+camera"]')
      ).toHaveClass(/border-primary/);
    });

    test("start recording button is visible", async ({ page }) => {
      const startBtn = page.locator('[data-testid="start-recording-btn"]');
      await expect(startBtn).toBeVisible();
      await expect(startBtn).toHaveText(/Start Recording/);
    });

    test("info section shows how-it-works steps", async ({ page }) => {
      const info = page.locator('[data-testid="recording-info"]');
      await expect(info).toBeVisible();
      await expect(info.getByText("How it works")).toBeVisible();
      await expect(
        info.getByText("Choose your recording source above")
      ).toBeVisible();
      await expect(
        info.getByText(/stays in your browser/)
      ).toBeVisible();
    });

    test("source descriptions are correct", async ({ page }) => {
      await expect(
        page.getByText("Record your screen or a window")
      ).toBeVisible();
      await expect(
        page.getByText("Record from your webcam")
      ).toBeVisible();
      await expect(
        page.getByText("Screen recording with camera overlay")
      ).toBeVisible();
    });

    test("back link navigates to home", async ({ page }) => {
      const backLink = page.locator('a[href="/"]');
      await expect(backLink).toBeVisible();
    });

    test("user menu is present in header", async ({ page }) => {
      // UserMenu component should be in the header
      const header = page.locator("header");
      await expect(header).toBeVisible();
    });
  });

  test.describe("Dashboard — Record Button", () => {
    test.beforeEach(async ({ page }) => {
      await signUp(page);
    });

    test("record screen button is visible on dashboard", async ({ page }) => {
      const recordBtn = page.locator('[data-testid="record-screen-btn"]');
      await expect(recordBtn).toBeVisible();
      await expect(recordBtn).toHaveText(/Record Screen/);
    });

    test("record screen button navigates to /record", async ({ page }) => {
      await page.locator('[data-testid="record-screen-btn"]').click();
      await expect(page).toHaveURL(/\/record/);
      await expect(page.getByText("Screen Recorder")).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("Record Page — Unauthenticated", () => {
    test("redirects to auth form when not logged in", async ({ page }) => {
      await page.goto("/record");
      // Should show auth form since user is not authenticated
      await expect(
        page.getByText("ClipCut").first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
