import { expect, test } from "@playwright/test";

test("admin access page keeps credentials empty by default", async ({ page }) => {
  await page.goto("/admin");
  const username = page.getByLabel("Username");
  const accessKey = page.getByLabel("Access key");
  await expect(username).toBeVisible();
  await expect(accessKey).toBeVisible();
  await expect(username).toHaveValue("");
  await expect(accessKey).toHaveValue("");
  await expect(page.getByRole("button", { name: "Quick access" })).toHaveCount(0);
});
