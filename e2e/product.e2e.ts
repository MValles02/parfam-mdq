import { expect, test } from "@playwright/test";
import { FIXTURE_DRAFT, FIXTURE_WOMEN } from "../scripts/lib/fixture-catalog";

test("published product page renders its name", async ({ page }) => {
  await page.goto(`/producto/${FIXTURE_WOMEN.slug}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: FIXTURE_WOMEN.name,
    }),
  ).toBeVisible();
});

test("draft product slug returns 404", async ({ page }) => {
  const response = await page.goto(`/producto/${FIXTURE_DRAFT.slug}`);
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
  await expect(kinds.getByRole("radio", { name: "Tester" })).toHaveCount(0);
});
