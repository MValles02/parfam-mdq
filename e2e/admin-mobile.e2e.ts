import { expect, test, type Page } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

test("the bottom nav navigates, opens Más and fits at 390", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const nav = page.getByRole("navigation", { name: "Panel" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Productos" }).click();
  await expect(page).toHaveURL(/\/admin\/productos$/);

  await nav.getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("link", { name: "Marcas" })).toBeVisible();
  await page.keyboard.press("Escape");

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test("the bottom nav is hidden at 1440", async ({ page }) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await expect(page.getByRole("navigation", { name: "Panel" })).toBeHidden();
});

test("product cards edit a decant price and toggle it at 390", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const name = "Fixture Eau de Prueba Mujer";
  await page.goto(`/admin/productos?q=${encodeURIComponent(name)}`);
  const card = page.getByRole("article").filter({ hasText: name }).first();
  const priceButton = card
    .getByRole("button", { name: /^Cambiar precio: .* Decant/ })
    .first();
  const priceInput = card.getByLabel(/^Precio: .* Decant/).first();

  await priceButton.click();
  const original = await priceInput.inputValue();
  await priceInput.fill("8100");
  await card.getByRole("button", { name: "OK" }).first().click();
  try {
    await expect(priceButton).toHaveText(/\$\s*8\.100/);
  } finally {
    await priceButton.click();
    await priceInput.fill(original);
    await card.getByRole("button", { name: "OK" }).first().click();
    await expect(priceButton).toHaveText(
      new RegExp(
        String.raw`\$\s*` +
          Number(original.replace(",", ".")).toLocaleString("es-AR"),
      ),
    );
  }

  const toggle = card.getByRole("switch", { name: /Decant/ }).first();
  const wasChecked = await toggle.isChecked();
  try {
    await toggle.click();
    await expect(toggle).toBeChecked({ checked: !wasChecked });
  } finally {
    if ((await toggle.isChecked()) !== wasChecked) {
      await toggle.click();
    }
    await expect(toggle).toBeChecked({ checked: wasChecked });
  }
});

test("the only active variant of a published product cannot be deactivated", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const name = "Fixture Eau de Prueba Unisex";
  const url = `/admin/productos?q=${encodeURIComponent(name)}`;
  await page.goto(url);
  const card = page.getByRole("article").filter({ hasText: name }).first();
  const toggle = card.getByRole("switch", { name: /Presentación activa/ });
  await expect(toggle).toBeChecked();

  await toggle.click();
  await expect(page.getByText(/única presentación activa/)).toBeVisible();

  await page.goto(url);
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: name })
      .first()
      .getByRole("switch", { name: /Presentación activa/ }),
  ).toBeChecked();
});

test("an invalid price shows an error and leaves the price unchanged", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const name = "Fixture Eau de Prueba Mujer";
  await page.goto(`/admin/productos?q=${encodeURIComponent(name)}`);
  const card = page.getByRole("article").filter({ hasText: name }).first();
  const priceButton = card
    .getByRole("button", { name: /^Cambiar precio: .* Decant/ })
    .first();
  const before = await priceButton.innerText();

  await priceButton.click();
  await card
    .getByLabel(/^Precio: .* Decant/)
    .first()
    .fill("abc");
  await card.getByRole("button", { name: "OK" }).first().click();
  await expect(page.getByText(/Usá sólo números/)).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: name })
      .first()
      .getByRole("button", { name: /^Cambiar precio: .* Decant/ })
      .first(),
  ).toHaveText(before);
});

test("pedidos and the product edit page fit at 390", async ({ page }) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const fits = () => page.evaluate(() => document.documentElement.scrollWidth);

  await page.goto("/admin/pedidos");
  expect(await fits()).toBeLessThanOrEqual(390);

  await page.goto("/admin/productos");
  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/productos\/[^/]+$/);
  expect(await fits()).toBeLessThanOrEqual(390);
});
