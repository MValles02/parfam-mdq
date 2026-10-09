import { expect, test } from "@playwright/test";

test("checkout creates an order and shows the thank-you page", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();

  await page.goto("/checkout");
  await page.getByLabel("Nombre y apellido").fill("E2E Prueba");
  await page.getByLabel("Tu WhatsApp").fill("223 555 0100");
  // The form opens a WhatsApp popup on submit; it is never navigated here.
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();

  await expect(page).toHaveURL(/\/pedido\/PM-\d+\/gracias/);
  await expect(
    page.getByRole("heading", { name: /Tu pedido quedó guardado/ }),
  ).toBeVisible();
  await expect(page.getByText(/PM-\d+/).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir WhatsApp de nuevo" }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\//);
});

test("checkout quantity stepper updates the total", async ({ page }) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Agregar una unidad" }).click();
  await expect(page.getByText(/50\.000/).first()).toBeVisible();
});

test("checkout rejects an incomplete phone and stays on the page", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();
  await page.goto("/checkout");
  await page.getByLabel("Nombre y apellido").fill("E2E Prueba");
  await page.getByLabel("Tu WhatsApp").fill("123");
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();
  const phone = page.getByLabel("Tu WhatsApp");
  const errorId = await phone.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${errorId}"]`)).toHaveText(
    /Revisá el teléfono|no parece completo/,
  );
  await expect(page).toHaveURL(/\/checkout$/);
});

test("checkout and thanks pages do not overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const overflows = () =>
    page.evaluate(() => document.documentElement.scrollWidth > 390);
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  // At 390px the sticky bottom bar can render a second add-to-cart button
  // while the main one is off-screen; either adds the same variant.
  await page
    .getByRole("button", { name: /^Agregar al carrito/ })
    .first()
    .click();
  await page.goto("/checkout");
  await expect(page.getByLabel("Tu WhatsApp")).toBeVisible();
  expect(await overflows()).toBe(false);
  await page.getByLabel("Nombre y apellido").fill("E2E Prueba");
  await page.getByLabel("Tu WhatsApp").fill("223 555 0100");
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();
  await expect(page).toHaveURL(/\/pedido\/PM-\d+\/gracias/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await overflows()).toBe(false);
});
