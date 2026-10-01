import { expect, test } from "@playwright/test";

test("published product page renders its name", async ({ page }) => {
  await page.goto("/producto/fixture-eau-de-prueba-mujer");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fixture Eau de Prueba Mujer",
    }),
  ).toBeVisible();
});

test("draft product slug returns 404", async ({ page }) => {
  const response = await page.goto("/producto/fixture-borrador");
  expect(response?.status()).toBe(404);
});
