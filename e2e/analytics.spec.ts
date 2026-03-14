import { test, expect } from "@playwright/test";

test.describe("Analytics Dashboard", () => {
  test("analytics route loads without errors", async ({ page }) => {
    await page.goto("/analytics");
    // Should show either the sign-in prompt or the analytics page
    await expect(
      page.getByText("Analytics").or(page.getByText("Sign in"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated users see sign-in prompt", async ({ page }) => {
    await page.goto("/analytics");
    await expect(
      page.getByText("Sign in to view your analytics")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Go to Home")).toBeVisible();
  });

  test("Go to Home link navigates back to dashboard", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("Go to Home")).toBeVisible({ timeout: 10_000 });
    await page.getByText("Go to Home").click();
    await expect(page).toHaveURL("/");
  });
});
