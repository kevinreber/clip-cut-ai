import { type Page, expect } from "@playwright/test";

export const TEST_USER = {
  email: `test-${Date.now()}@clipcut.test`,
  password: "testpassword123",
};

/**
 * Sign up a new user and return to authenticated home.
 */
export async function signUp(page: Page, user = TEST_USER) {
  await page.goto("/");
  // Wait for auth form to load
  await expect(page.getByText("ClipCut")).toBeVisible();

  // Switch to sign up flow
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(
    page.getByText("Create an account to get started")
  ).toBeVisible();

  // Fill the form
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create Account" }).click();

  // Wait for authenticated home
  await expect(page.getByText("Remove filler words instantly")).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Sign in an existing user.
 */
export async function signIn(page: Page, user = TEST_USER) {
  await page.goto("/");
  await expect(page.getByText("ClipCut")).toBeVisible();

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Remove filler words instantly")).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Create a small test video blob and upload it via the file input.
 */
export async function uploadTestVideo(page: Page, filename = "test-video.mp4") {
  // Create a minimal valid mp4 buffer (won't actually play but will upload)
  const buffer = Buffer.alloc(1024);
  // Minimal ftyp box
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x14, // size = 20
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // 'isom'
    0x00, 0x00, 0x00, 0x00, // minor version
    0x69, 0x73, 0x6f, 0x6d, // compatible brand 'isom'
  ]);
  ftyp.copy(buffer);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: filename,
    mimeType: "video/mp4",
    buffer,
  });
}
