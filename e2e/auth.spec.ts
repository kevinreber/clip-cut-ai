import { test, expect } from "@playwright/test";
import { TEST_USER, signUp, signIn } from "./helpers";

test.describe("Authentication", () => {
  test("shows login form on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ClipCut")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("can toggle between sign in and sign up", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Sign in to access your projects")
    ).toBeVisible();

    // Switch to sign up
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(
      page.getByText("Create an account to get started")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeVisible();

    // Switch back to sign in
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Sign in to access your projects")
    ).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("invalid@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Invalid email or password")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("enforces minimum password length on sign up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign up" }).click();

    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toHaveAttribute("minlength", "8");
  });

  test("can sign up and reach dashboard", async ({ page }) => {
    await signUp(page);
    await expect(page.getByText("Remove filler words instantly")).toBeVisible();
    await expect(page.getByText("Upload a video to get started")).toBeVisible();
  });

  test("can sign out", async ({ page }) => {
    await signUp(page);

    // Click sign out
    await page.getByRole("button", { name: "Sign Out" }).click();

    // Should return to login form
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });
  });

  test("redirects unauthenticated users to login on project page", async ({
    page,
  }) => {
    await page.goto("/project/fake-id");
    // Should show auth form, not the editor
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });
  });
});
