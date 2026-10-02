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
