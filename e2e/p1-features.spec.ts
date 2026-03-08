import { test, expect } from "@playwright/test";

test.describe("Text-Based Editor Mode — Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Demo: Tech Talk Presentation")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("editor mode toggle is visible with Word and Text buttons", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await expect(toggle).toBeVisible();
    await expect(toggle.getByText("Word")).toBeVisible();
    await expect(toggle.getByText("Text")).toBeVisible();
  });

  test("defaults to Word mode with word-level buttons visible", async ({
    page,
  }) => {
    // Word-level transcript should be visible by default
    await expect(page.getByRole("button", { name: "welcome" })).toBeVisible();

    // Text-based editor should NOT be visible
    await expect(
      page.locator('[data-testid="text-based-editor"]')
    ).not.toBeVisible();
  });

  test("switches to Text mode and shows paragraphs", async ({ page }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await toggle.getByText("Text").click();

    // Text-based editor should now be visible
    const textEditor = page.locator('[data-testid="text-based-editor"]');
    await expect(textEditor).toBeVisible();

    // Should show paragraph count
    await expect(textEditor.getByText(/paragraph/)).toBeVisible();

    // Multiple paragraphs should be rendered (demo has silences that split them)
    await expect(page.locator('[data-testid="paragraph-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="paragraph-1"]')).toBeVisible();
  });

  test("switches back to Word mode and hides text editor", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');

    // Switch to Text mode
    await toggle.getByText("Text").click();
    await expect(
      page.locator('[data-testid="text-based-editor"]')
    ).toBeVisible();

    // Switch back to Word mode
    await toggle.getByText("Word").click();
    await expect(
      page.locator('[data-testid="text-based-editor"]')
    ).not.toBeVisible();

    // Word-level buttons should be back
    await expect(page.getByRole("button", { name: "welcome" })).toBeVisible();
  });

  test("paragraphs display timestamps starting near 0:00", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await toggle.getByText("Text").click();

    // First paragraph should start near 0:00
    const firstParagraph = page.locator('[data-testid="paragraph-0"]');
    await expect(firstParagraph).toBeVisible();

    // Should contain a timestamp
    const timestampBtn = firstParagraph.locator("button").first();
    await expect(timestampBtn).toContainText("0:");
  });

  test("can delete a paragraph and it shows line-through styling", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await toggle.getByText("Text").click();

    const firstParagraph = page.locator('[data-testid="paragraph-0"]');
    await expect(firstParagraph).toBeVisible();

    // Hover to reveal the delete button
    await firstParagraph.hover();
    const deleteBtn = firstParagraph.getByRole("button", { name: "Delete" });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // The paragraph text should now have line-through styling
    await expect(firstParagraph.locator(".line-through")).toBeVisible();
  });

  test("can restore a deleted paragraph", async ({ page }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await toggle.getByText("Text").click();

    const firstParagraph = page.locator('[data-testid="paragraph-0"]');

    // Delete paragraph
    await firstParagraph.hover();
    await firstParagraph.getByRole("button", { name: "Delete" }).click();
    await expect(firstParagraph.locator(".line-through")).toBeVisible();

    // Restore paragraph
    await firstParagraph.hover();
    const restoreBtn = firstParagraph.getByRole("button", {
      name: "Restore",
    });
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    // line-through should be gone
    await expect(firstParagraph.locator(".line-through")).not.toBeVisible();
  });

  test("paragraphs are draggable", async ({ page }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await toggle.getByText("Text").click();

    // Each paragraph should have draggable attribute
    const firstParagraph = page.locator('[data-testid="paragraph-0"]');
    await expect(firstParagraph).toHaveAttribute("draggable", "true");
  });

  test("first paragraph contains expected transcript text", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');
    await toggle.getByText("Text").click();

    // First paragraph should contain words from the beginning
    const firstParagraph = page.locator('[data-testid="paragraph-0"]');
    await expect(firstParagraph).toContainText("welcome");
    await expect(firstParagraph).toContainText("presentation");
    await expect(firstParagraph).toContainText("applications");
  });

  test("deleting paragraph in text mode reflects in word mode", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="editor-mode-toggle"]');

    // Switch to Text mode and delete first paragraph
    await toggle.getByText("Text").click();
    const firstParagraph = page.locator('[data-testid="paragraph-0"]');
    await firstParagraph.hover();
    await firstParagraph.getByRole("button", { name: "Delete" }).click();

    // Switch back to Word mode
    await toggle.getByText("Word").click();

    // The word "welcome" should now appear with deleted styling
    const welcomeWord = page.getByRole("button", { name: "welcome" });
    await expect(welcomeWord).toBeVisible();
    await expect(welcomeWord).toHaveClass(/line-through/);
  });
});

test.describe("Regression — Demo page after P1 changes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Demo: Tech Talk Presentation")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Remove All Fillers still works", async ({ page }) => {
    const removeFillers = page.getByRole("button", {
      name: /Remove All Fillers/,
    });
    await expect(removeFillers).toBeVisible();
    await removeFillers.click();

    // Editing stats should appear after removing fillers
    const stats = page.locator('[data-testid="editing-stats"]');
    await expect(stats).toBeVisible({ timeout: 5_000 });
  });

  test("filler chart is still visible", async ({ page }) => {
    const chart = page.locator('[data-testid="filler-chart"]');
    await expect(chart).toBeVisible({ timeout: 5_000 });
  });

  test("timeline is still visible", async ({ page }) => {
    const timeline = page.locator('[data-testid="timeline"]');
    await expect(timeline).toBeVisible({ timeout: 5_000 });
  });

  test("search still works", async ({ page }) => {
    const searchInput = page.locator('[data-testid="transcript-search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("performance");

    // Should find at least one match
    await expect(page.getByText(/1\//)).toBeVisible({ timeout: 5_000 });
  });

  test("silence shortener still works", async ({ page }) => {
    const shortener = page.locator('[data-testid="silence-shortener"]');
    await expect(shortener).toBeVisible();
    await expect(
      shortener.getByRole("button", { name: "Shorten Silences" })
    ).toBeVisible();
  });

  test("before/after compare still works", async ({ page }) => {
    const compareBtn = page.locator('[data-testid="before-after-btn"]');
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();

    const panel = page.locator('[data-testid="before-after-panel"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Before")).toBeVisible();
    await expect(panel.getByText("After")).toBeVisible();
  });
});
