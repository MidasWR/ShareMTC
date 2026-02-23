import { expect, test } from "@playwright/test";

test("blocks app when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sign in to access operational modules, dashboards, and server management controls.")).toBeVisible();
});

test("shows shell when session exists", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("host_token", "dummy.token.payload");
    localStorage.setItem(
      "host_user",
      JSON.stringify({
        id: "smoke-user",
        email: "smoke@example.com",
        role: "user"
      })
    );
  });
  await page.reload();
  await expect(page.getByText("ShareMTC Control Plane")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pods & Allocations" })).toBeVisible();
  await expect(page.getByText("Authentication required. Sign in to access pods, billing, and provider operations.")).toHaveCount(0);
});
