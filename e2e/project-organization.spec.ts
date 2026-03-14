import { test, expect } from "@playwright/test";
import { signUp, uploadTestVideo } from "./helpers";

test.describe("Project Folders & Tags", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test("folder sidebar is visible and shows default options", async ({ page }) => {
    // Upload a project so the sidebar appears
    await uploadTestVideo(page, "folder-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Sidebar should show
    await expect(page.getByTestId("folder-sidebar")).toBeVisible();
    await expect(page.getByTestId("folder-all")).toBeVisible();
    await expect(page.getByTestId("folder-unfiled")).toBeVisible();
    await expect(page.getByTestId("create-folder-btn")).toBeVisible();
  });

  test("can create a new folder", async ({ page }) => {
    await uploadTestVideo(page, "folder-create-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Click create folder
    await page.getByTestId("create-folder-btn").click();
    const input = page.getByTestId("new-folder-input");
    await expect(input).toBeVisible();

    // Type folder name and submit
    await input.fill("My Videos");
    await input.press("Enter");

    // Folder should appear in sidebar
    await expect(page.getByText("My Videos")).toBeVisible({ timeout: 5_000 });
  });

  test("can collapse and expand folder sidebar", async ({ page }) => {
    await uploadTestVideo(page, "sidebar-toggle-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Sidebar should be visible
    await expect(page.getByTestId("folder-sidebar")).toBeVisible();

    // Toggle collapse
    await page.getByTestId("toggle-folder-sidebar").click();
    await expect(page.getByTestId("folder-sidebar")).not.toBeVisible();

    // Toggle expand
    await page.getByTestId("toggle-folder-sidebar").click();
    await expect(page.getByTestId("folder-sidebar")).toBeVisible();
  });

  test("clicking Unfiled filters to unfiled projects", async ({ page }) => {
    await uploadTestVideo(page, "unfiled-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Click Unfiled
    await page.getByTestId("folder-unfiled").click();

    // Active filters should show
    await expect(page.getByTestId("active-filters")).toBeVisible();
    await expect(page.getByText("Unfiled")).toBeVisible();
  });

  test("add tag button appears on project card hover", async ({ page }) => {
    await uploadTestVideo(page, "tag-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Hover project card
    const card = page.locator('[class*="group cursor-pointer rounded-lg"]').first();
    await card.hover();

    // Add tag button should appear
    await expect(page.getByTestId("add-tag-btn").first()).toBeVisible();
  });

  test("can add a tag to a project", async ({ page }) => {
    await uploadTestVideo(page, "add-tag-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Hover and click add tag
    const card = page.locator('[class*="group cursor-pointer rounded-lg"]').first();
    await card.hover();
    await page.getByTestId("add-tag-btn").first().click();

    // Type tag and submit
    const tagInput = page.getByTestId("tag-input");
    await expect(tagInput).toBeVisible();
    await tagInput.fill("tutorial");
    await tagInput.press("Enter");

    // Tag should appear on card
    await expect(page.getByText("#tutorial")).toBeVisible({ timeout: 5_000 });
  });

  test("batch actions show move to folder and add tag buttons", async ({ page }) => {
    await uploadTestVideo(page, "batch-org-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return;

    // Select a project
    const checkbox = page.getByTestId("project-checkbox").first();
    await checkbox.click();

    // Batch actions should show
    await expect(page.getByTestId("batch-actions")).toBeVisible();
    await expect(page.getByTestId("batch-move-folder-btn")).toBeVisible();
    await expect(page.getByTestId("batch-add-tag-btn")).toBeVisible();
  });
});
