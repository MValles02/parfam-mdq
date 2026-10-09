import { expect, test } from "@playwright/test";

test("checkout creates an order and shows the thank-you page", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();

  await page.goto("/checkout");
  await page.getByLabel("Tu nombre").fill("E2E Prueba");
  await page.getByLabel("Tu teléfono").fill("223 555 0100");
  // The form opens a WhatsApp popup on submit; it is never navigated here.
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();

  await expect(page).toHaveURL(/\/pedido\/PM-\d+\/gracias/);
  await expect(
    page.getByRole("heading", { name: /Tu pedido PM-\d+ quedó guardado/ }),
  ).toBeVisible();
});

test("checkout validates name and phone before sending", async ({ page }) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();

  await page.goto("/checkout");
  await page.getByLabel("Tu teléfono").fill("123");
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();

  await expect(page.getByText("Poné tu nombre completo.")).toBeVisible();
  await expect(
    page.getByText("Ese teléfono no parece completo."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);
});

test("thank-you page recaps the WhatsApp message with order number and product", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();

  await page.goto("/checkout");
  await page.getByLabel("Tu nombre").fill("E2E Prueba");
  await page.getByLabel("Tu teléfono").fill("223 555 0100");
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
