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

test("admin filters and searches the product list without overflowing at 390", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/admin/productos?estado=borradores");
  await expect(
    page.getByRole("button", { name: /^Borradores\s+[\d.]+/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: /Visible en la tienda/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await expect(
    page.getByText("Fixture", { exact: false }).first(),
  ).toBeVisible();

  await page.getByPlaceholder("Buscar producto o marca").fill("fixture");
  await expect(page).toHaveURL(/q=fixture/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/productos");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test("admin starts a new product from scratch and /nuevo fits at 390", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);

  await page.goto("/admin/productos/nuevo");
  await expect(page.getByText("Ficha de la fragancia")).toHaveCount(0);
  await page.getByRole("radio", { name: /Empezar de cero/ }).click();
  await expect(page.getByText("Ficha de la fragancia")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/productos/nuevo");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test("admin adopts a reference from the search results", async ({ page }) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);

  // CI has no FragranceRef rows, so this test is skipped when search is empty.
  await page.goto("/admin/productos/nuevo");
  await page.getByLabel("Buscar en el catálogo de referencia").fill("chanel");
  const firstHit = page.locator("form ul button").first();
  const found = await firstHit
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!found, "no reference catalog data");
  await firstHit.click();
  await page.getByRole("button", { name: "Usar estos datos" }).click();
  await expect(page.getByText("Ficha de la fragancia")).toBeVisible();
});

test("the Visible switch publishes and unpublishes a fixture draft", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);

  await page.goto("/admin/productos?estado=borradores");
  const name = (
    await page
      .getByRole("link", { name: /Fixture/i })
      .first()
      .innerText()
  )
    .split("\n")[0]!
    .trim();

  // Estado "todos" keeps the row on screen after its status changes.
  await page.goto(`/admin/productos?q=${encodeURIComponent(name)}`);
  const row = page.getByRole("row").filter({ hasText: name }).first();
  const toggle = row.getByRole("switch");
  await toggle.click();
  const failed = page.getByText(/no se puede publicar/);
  const published = row.getByText("Publicado", { exact: true });
  await expect(failed.or(published)).toBeVisible();
  if (await failed.isVisible()) return; // publish rule blocked it; nothing to undo

  await toggle.click();
  await expect(row.getByText("Borrador", { exact: true })).toBeVisible();
});

test("admin edits a draft: checklist is visible, Guardar saves, and the page fits at 390", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/admin/productos?estado=borradores");
  await page
    .getByRole("link", { name: /Fixture/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/productos\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Para publicar" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Vista previa" })).toHaveCount(0);

  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Borrador guardado.")).toBeVisible();

  const editPath = new URL(page.url()).pathname;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(editPath);
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
