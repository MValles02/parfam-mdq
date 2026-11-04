import { expect, test } from "@playwright/test";
import { FIXTURE_UNISEX } from "../scripts/lib/fixture-catalog";

test("checkout creates an order and shows the thank-you page", async ({
  page,
}) => {
  await page.goto(`/producto/${FIXTURE_UNISEX.slug}`);
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();

  await page.goto("/checkout");
  await page.getByLabel("Nombre y apellido").fill("E2E Prueba");
  await page.getByLabel("Tu WhatsApp").fill("223 555 0100");
  // The form opens a WhatsApp popup on submit; it is never navigated here.
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();

  await expect(page).toHaveURL(/\/pedido\/PM-\d+\/gracias/);
  const number = page.url().match(/PM-\d+/)![0];
  const message = page
    .locator("div", { has: page.getByText("Tu mensaje", { exact: true }) })
    .last();
  await expect(message).toContainText(number);
  await expect(message).toContainText("Fixture Eau de Prueba Unisex");
});

test("checkout quantity stepper updates the total", async ({ page }) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Agregar una unidad" }).click();
  await expect(page.getByText(/50\.000/).first()).toBeVisible();
});

test("checkout validates name and phone before sending", async ({ page }) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();

  await page.goto("/checkout");
  await page.getByLabel("Tu WhatsApp").fill("123");
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();

  await expect(page.getByText("Poné tu nombre completo.")).toBeVisible();
  await expect(
    page.getByText("Ese teléfono no parece completo."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);
});

test("thank-you page for an unknown order number shows the generic heading", async ({
  page,
}) => {
  // "PM-12abc" is not a valid order number and no WhatsApp link is stored.
  await page.goto("/pedido/PM-12abc/gracias");
  await expect(
    page.getByRole("heading", { name: "Tu pedido quedó guardado" }),
  ).toBeVisible();
  await expect(page.getByText("Tu mensaje", { exact: true })).toHaveCount(0);
});
