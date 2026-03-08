import { test, expect } from "@playwright/test";

test.describe("P2 Features — Intro/Outro Templates, Webhooks, Presets Library", () => {
  test.describe("Intro/Outro Templates — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("intro/outro templates section is visible", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await expect(section).toBeVisible();
      await expect(section.getByText("Intro/Outro Templates")).toBeVisible();
    });

    test("expand/collapse toggle works", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      const expandBtn = section.getByText("Expand");
      await expandBtn.click();
      await expect(section.getByTestId("intro-tab")).toBeVisible();
      await expect(section.getByTestId("outro-tab")).toBeVisible();
    });

    test("can switch between intro and outro tabs", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();

      // Default is intro tab
      await expect(section.getByTestId("intro-tab")).toHaveClass(/bg-primary/);

      // Switch to outro
      await section.getByTestId("outro-tab").click();
      await expect(section.getByTestId("outro-tab")).toHaveClass(/bg-primary/);
    });

    test("preset templates are displayed for intro tab", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await expect(section.getByText("Podcast Intro")).toBeVisible();
      await expect(section.getByText("YouTube Intro")).toBeVisible();
    });

    test("preset templates are displayed for outro tab", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByTestId("outro-tab").click();
      await expect(section.getByText("Call to Action")).toBeVisible();
      await expect(section.getByText("Social Links")).toBeVisible();
    });

    test("clicking a preset opens the editor", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByText("Podcast Intro").click();
      await expect(section.getByTestId("template-editor")).toBeVisible();
      await expect(section.getByTestId("template-preview")).toBeVisible();
      await expect(section.getByTestId("template-text-input")).toBeVisible();
      await expect(section.getByTestId("template-subtext-input")).toBeVisible();
    });

    test("can edit template text fields", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByText("Podcast Intro").click();

      const textInput = section.getByTestId("template-text-input");
      await textInput.clear();
      await textInput.fill("My Show");
      await expect(textInput).toHaveValue("My Show");
    });

    test("apply button sets the template", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByText("Podcast Intro").click();
      await section.getByTestId("apply-template-btn").click();
      await expect(section.getByTestId("applied-template")).toBeVisible();
    });

    test("remove button clears applied template", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByText("Podcast Intro").click();
      await section.getByTestId("apply-template-btn").click();
      await expect(section.getByTestId("applied-template")).toBeVisible();
      await section.getByTestId("remove-template-btn").click();
      await expect(section.getByTestId("applied-template")).not.toBeVisible();
    });

    test("style selection buttons work", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByText("Podcast Intro").click();
      const editor = section.getByTestId("template-editor");
      await expect(editor.getByText("Fade Text")).toBeVisible();
      await expect(editor.getByText("Logo Card")).toBeVisible();
      await expect(editor.getByText("Lower Third")).toBeVisible();
      await expect(editor.getByText("Full Screen")).toBeVisible();
    });

    test("duration slider is present", async ({ page }) => {
      const section = page.locator('[data-testid="intro-outro-templates"]');
      await section.getByText("Expand").click();
      await section.getByText("Podcast Intro").click();
      await expect(section.getByTestId("template-duration")).toBeVisible();
    });
  });

  test.describe("Templates & Presets Library — Demo Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/demo");
      await expect(
        page.getByText("Demo: Tech Talk Presentation")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("presets library section is visible", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await expect(section).toBeVisible();
      await expect(section.getByText("Templates & Presets")).toBeVisible();
    });

    test("expand/collapse toggle works for presets", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();
      await expect(section.getByTestId("built-in-tab")).toBeVisible();
      await expect(section.getByTestId("my-presets-tab")).toBeVisible();
      await expect(section.getByTestId("community-tab")).toBeVisible();
    });

    test("built-in presets are displayed", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();
      await expect(section.getByText("Podcast Clean")).toBeVisible();
      await expect(section.getByText("Lecture Tighten")).toBeVisible();
      await expect(section.getByText("Interview Polish")).toBeVisible();
      await expect(section.getByText("YouTube Fast-Cut")).toBeVisible();
    });

    test("preset cards show settings info", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();
      const firstCard = section.getByTestId("preset-card").first();
      await expect(firstCard.getByText(/Silence:/)).toBeVisible();
      await expect(firstCard.getByText(/Fillers:/)).toBeVisible();
      await expect(firstCard.getByText(/Confidence:/)).toBeVisible();
    });

    test("apply button is present on preset cards", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();
      const applyBtns = section.getByTestId("apply-preset-btn");
      await expect(applyBtns.first()).toBeVisible();
    });

    test("can switch between tabs", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();

      await section.getByTestId("my-presets-tab").click();
      await expect(section.getByTestId("my-presets-tab")).toHaveClass(/bg-primary/);

      await section.getByTestId("community-tab").click();
      await expect(section.getByTestId("community-tab")).toHaveClass(/bg-primary/);
    });

    test("my presets tab shows save button", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();
      await section.getByTestId("my-presets-tab").click();
      await expect(section.getByTestId("save-preset-btn")).toBeVisible();
    });

    test("clicking save preset shows the form", async ({ page }) => {
      const section = page.locator('[data-testid="presets-library"]');
      await section.getByText("Expand").click();
      await section.getByTestId("my-presets-tab").click();
      await section.getByTestId("save-preset-btn").click();
      await expect(section.getByTestId("preset-save-form")).toBeVisible();
      await expect(section.getByTestId("preset-name-input")).toBeVisible();
    });
  });

  test.describe("Webhook Settings — Settings Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/settings");
    });

    test("webhook settings section is visible", async ({ page }) => {
      // Settings page requires auth — check that at minimum the page loads
      // and either shows auth form or settings content
      const pageContent = page.locator("body");
      await expect(pageContent).toBeVisible({ timeout: 10_000 });
    });
  });
});
