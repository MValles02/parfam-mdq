import { expect, test } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

test("admin opens a pending order, confirms it and finds it under confirmados", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );

  // Create an order through the real checkout, as the store does.
  await page.goto("/producto/fixture-eau-de-prueba-unisex");
  await page.getByRole("button", { name: /^Agregar al carrito/ }).click();
  await page.goto("/checkout");
  await page.getByLabel("Nombre y apellido").fill("E2E Pedidos");
  await page.getByLabel("Tu WhatsApp").fill("223 555 0101");
  await page
    .getByRole("button", { name: "Enviar pedido por WhatsApp" })
    .click();
  await expect(page).toHaveURL(/\/pedido\/PM-\d+\/gracias/);
  const number = /PM-\d+/.exec(page.url())![0];

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/admin/pedidos?estado=pendientes");
  const list = page.getByRole("region", { name: "Lista de pedidos" });
  const detail = page.getByRole("region", { name: "Detalle del pedido" });
  await list.getByRole("link", { name: new RegExp(number) }).click();
  await expect(page).toHaveURL(/pedido=/);
  await expect(detail.getByText(number).first()).toBeVisible();
  await expect(detail.getByRole("row")).not.toHaveCount(1);

  await detail.getByRole("button", { name: "Pasar a Confirmado" }).click();
  await expect(detail.getByText("Pendiente")).toHaveCount(1); // only the step bar
  await expect(
    detail.getByRole("button", { name: "Pasar a Entregado" }),
  ).toBeVisible();

  // Transitions: a delivered order cannot be cancelled; a cancelled one reopens.
  await detail.getByRole("button", { name: "Pasar a Entregado" }).click();
  await expect(
    detail.getByRole("button", { name: "Pasar a Entregado" }),
  ).toHaveCount(0);
  await detail.getByRole("combobox").click();
  await expect(page.getByRole("option", { name: "Cancelado" })).toHaveCount(0);
  await page.getByRole("option", { name: "Confirmado" }).click();
  await expect(
    detail.getByRole("button", { name: "Pasar a Entregado" }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(
    detail.getByRole("button", { name: "Cancelar pedido" }),
  ).toHaveCount(0);
  await detail.getByRole("combobox").click();
  await page.getByRole("option", { name: "Pendiente" }).click();
  await expect(
    detail.getByRole("button", { name: "Pasar a Confirmado" }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Pasar a Confirmado" }).click();
  await expect(
    detail.getByRole("button", { name: "Pasar a Entregado" }),
  ).toBeVisible();

  await page.goto("/admin/pedidos?estado=confirmados");
  await expect(
    list.getByRole("link", { name: new RegExp(number) }),
  ).toBeVisible();

  // Phone search ignores formatting: stored as +549223..., typed with dashes.
  await page.goto("/admin/pedidos?q=223-555 0101");
  await expect(
    list.getByRole("link", { name: new RegExp(number) }),
  ).toBeVisible();

  await page.goto("/admin/pedidos?estado=cancelados");
  await expect(
    list.getByRole("link", { name: new RegExp(number) }),
  ).toHaveCount(0);

  // 1440: the list scrolls on its own once there are enough orders.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/pedidos");
  const rowCount = await list.getByRole("link").count();
  if (rowCount > 8) {
    const scrolls = await list.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(scrolls).toBe(true);
  }
  await list.getByRole("link", { name: new RegExp(number) }).click();
  await expect(page).toHaveURL(/pedido=/);
  const detailPath = new URL(page.url()).pathname + new URL(page.url()).search;

  // 390: no horizontal overflow and the detail has a way back to the list.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/admin", "/admin/pedidos", detailPath]) {
    await page.goto(path);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth, path).toBeLessThanOrEqual(390);
  }
  await expect(
    page.getByRole("link", { name: "Volver a pedidos" }),
  ).toBeVisible();
});
