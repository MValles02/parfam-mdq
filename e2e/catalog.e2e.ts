import { expect, test } from "@playwright/test";

test("catalog lists only published products with active variants", async ({
  page,
}) => {
  await page.goto("/");

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

const fixtureHeading = /^Fixture Eau de Prueba (Mujer|Hombre|Unisex)$/;

test("product card shows the cheapest active variant as the starting price", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByRole("link").filter({
    has: page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  });
  await expect(card).toContainText("desde");
  await expect(card).toContainText("8.000");
  await expect(card).not.toContainText("45.000");
});

test("catalog sorts by price and by name", async ({ page }) => {
  const order = async (sort: string) => {
    await page.goto(`/?orden=${sort}`);
    const headings = page.getByRole("heading", { name: fixtureHeading });
    await expect(headings).toHaveCount(3);
    return headings.allTextContents();
  };
  const mujer = "Fixture Eau de Prueba Mujer";
  const hombre = "Fixture Eau de Prueba Hombre";
  const unisex = "Fixture Eau de Prueba Unisex";

  expect(await order("precio-asc")).toEqual([mujer, unisex, hombre]);
  expect(await order("precio-desc")).toEqual([hombre, unisex, mujer]);
  expect(await order("nombre")).toEqual([hombre, mujer, unisex]);
});
