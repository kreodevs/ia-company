import { test, expect } from "@playwright/test";

/**
 * Oleada 3 pilot — smoke path for unified memory hub.
 * Requires a running frontend (`E2E_BASE_URL`, default http://localhost:5173) and authenticated session cookies if gated.
 */
test.describe("office memory hub", () => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to run browser E2E");

  test("memoria page exposes company tab", async ({ page }) => {
    await page.goto("/office/memoria?tab=empresa");
    await expect(page.getByTestId("memoria-tab-empresa")).toBeVisible();
    await expect(page.getByTestId("memoria-tab-producto")).toBeVisible();
    await expect(page.getByTestId("memoria-tab-historial")).toBeVisible();
  });
});
