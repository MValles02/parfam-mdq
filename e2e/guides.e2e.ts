import { expect, test } from "@playwright/test";

test("guide pages load", async ({ page }) => {
  for (const path of [
    "/presentaciones",
    "/concentraciones",
    "/como-comprar",
    "/contacto",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
  }
});
