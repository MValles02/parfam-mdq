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

test("a price typed with a decimal point keeps its decimals", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  // The product cards (price edit, switches) only render below the table breakpoint.
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
  await priceInput.fill("8100.50");
  await card.getByRole("button", { name: "OK" }).first().click();
  try {
    await expect(priceButton).toHaveText(/\$\s*8\.100,50/);
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
});

test("the only active variant of a published product cannot be deactivated", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  // The product cards (price edit, switches) only render below the table breakpoint.
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
  // The product cards (price edit, switches) only render below the table breakpoint.
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
