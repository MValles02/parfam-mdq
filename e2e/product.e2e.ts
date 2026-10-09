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

test("Se parece a lists gender-compatible products sharing an accord", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-mujer");
  const similar = page.locator("section", {
    has: page.getByRole("heading", { name: "Se parece a" }),
  });
  await expect(
    similar.getByRole("heading", { name: "Fixture Eau de Prueba Unisex" }),
  ).toBeVisible();
  // A men's fragrance never matches a women's one, and a product is never
  // similar to itself.
  await expect(
    similar.getByRole("heading", { name: "Fixture Eau de Prueba Hombre" }),
  ).toHaveCount(0);
  await expect(
    similar.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  ).toHaveCount(0);
});
