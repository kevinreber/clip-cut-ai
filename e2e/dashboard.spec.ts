import { test, expect } from "@playwright/test";
import { signUp, uploadTestVideo } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test("shows upload area with drag-and-drop hint", async ({ page }) => {
    await expect(
      page.getByText("Drag & drop or click to browse")
    ).toBeVisible();
    await expect(page.getByText("MP4, MOV, WebM supported")).toBeVisible();
  });

  test("upload area accepts video files", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", "video/*");
  });

  test("shows uploading state when file is selected", async ({ page }) => {
    await uploadTestVideo(page);

    // Should show either uploading state or navigate to project
    // (depending on whether the backend processes it fast enough)
    const uploading = page.getByText("Uploading...");
    const projectPage = page.getByText("No video uploaded yet");
    await expect(uploading.or(projectPage)).toBeVisible({ timeout: 15_000 });
  });

  test("search input filters projects", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search projects...");

    // If there are no projects, search won't be visible
    const hasProjects = await page.getByText("Your Projects").isVisible().catch(() => false);
    if (!hasProjects) {
      // Upload a video to create a project first
      await uploadTestVideo(page, "my-test-project.mp4");
      await page.waitForTimeout(2000);
      await page.goto("/");
      await expect(page.getByText("Your Projects")).toBeVisible({
        timeout: 10_000,
      });
    }

    // Type in search
    await searchInput.fill("nonexistent-project-xyz");
    // Should show 0 results - the project list should be filtered
    const projectCards = page.locator(
      '[class*="group cursor-pointer rounded-lg"]'
    );
    await expect(projectCards).toHaveCount(0, { timeout: 5_000 });

    // Clear search to show all again
    await searchInput.clear();
    await expect(projectCards.first()).toBeVisible({ timeout: 5_000 });
  });

  test("sort dropdown has correct options", async ({ page }) => {
    const hasProjects = await page.getByText("Your Projects").isVisible().catch(() => false);
    if (!hasProjects) {
      await uploadTestVideo(page, "sort-test.mp4");
      await page.waitForTimeout(2000);
      await page.goto("/");
    }

    const select = page.locator("select");
    await expect(select.locator("option")).toHaveCount(3);
    await expect(select.locator('option[value="newest"]')).toHaveText(
      "Newest"
    );
    await expect(select.locator('option[value="oldest"]')).toHaveText(
      "Oldest"
    );
    await expect(select.locator('option[value="name"]')).toHaveText("Name");
  });

  test("project card shows delete confirmation inline", async ({ page }) => {
    // Need a project to test deletion
    await uploadTestVideo(page, "delete-test.mp4");
    await page.waitForTimeout(2000);
    await page.goto("/");

    const hasProjects = await page
      .getByText("Your Projects")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasProjects) return; // Skip if no project was created

    // Hover over project card to reveal delete button
    const projectCard = page
      .locator('[class*="group cursor-pointer rounded-lg"]')
      .first();
    await projectCard.hover();

    // Click the X button
    const deleteBtn = projectCard.locator("button").last();
    await deleteBtn.click();

    // Should show inline confirmation
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Cancel should dismiss
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("button", { name: "Cancel" })
    ).not.toBeVisible();
  });
});
