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

test("multi-kind product lets you pick Decant and its size", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-mujer");
  const kinds = page.getByRole("radiogroup", { name: "Presentación" });
  await expect(
    kinds.getByRole("radio", { name: "Frasco entero" }),
  ).toBeVisible();
  await kinds.getByRole("radio", { name: "Decant" }).click();
  await expect(page.getByRole("radio", { name: /5 ml/ })).toBeVisible();
  await expect(page.getByText(/8\.000/).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Agregar al carrito · Decant 5 ml" }),
  ).toBeVisible();
});

test("single-kind product has no Presentación group", async ({ page }) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await expect(page.getByRole("radiogroup", { name: "Tamaño" })).toBeVisible();
  await expect(
    page.getByRole("radiogroup", { name: "Presentación" }),
  ).toHaveCount(0);
});

test("hombre fixture sells Frasco entero 100 ml and hides the legacy tester", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-hombre");
  await expect(
    page.getByRole("button", {
      name: "Agregar al carrito · Frasco entero 100 ml",
    }),
  ).toBeVisible();
  await expect(page.getByText("Tester")).toHaveCount(0);
});

test("product page does not overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/producto/fixture-eau-de-prueba-mujer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > 390,
  );
  expect(overflows).toBe(false);
});

test("Se parece a lists gender-compatible products sharing an accord", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-mujer");
  const similar = page.locator("section", {
    has: page.getByRole("heading", { name: "Si te gusta, probá también" }),
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
