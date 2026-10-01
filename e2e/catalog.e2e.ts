import { expect, test } from "@playwright/test";

test("catalog lists only published products with active variants", async ({
  page,
}) => {
  await page.goto("/catalogo");

  for (const name of [
    "Fixture Eau de Prueba Mujer",
    "Fixture Eau de Prueba Hombre",
    "Fixture Eau de Prueba Unisex",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Borrador" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Sin Stock" }),
  ).toHaveCount(0);
});
