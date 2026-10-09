import { expect, test } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

test("admin sets a brand country inline and the brands page fits at 390", async ({
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

  // Unique per run so the spec stays re-runnable.
  const country = `Pais ${Date.now()}`;
  await page.goto("/admin/marcas?q=fixture-brand-a");
  await page.getByLabel("País de fixture-brand-a").fill(country);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Marca actualizada.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("País de fixture-brand-a")).toHaveValue(country);

  await page.goto("/admin/marcas?filtro=sin-corregir");
  await expect(page.getByRole("heading", { name: "Marcas" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/admin/marcas", "/admin/marcas?filtro=sin-corregir"]) {
    await page.goto(path);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth, path).toBeLessThanOrEqual(390);
  }
});

test("the uncorrected-brands banner link sets filtro in the URL", async ({
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

  await page.goto("/admin/marcas");
  const link = page.getByRole("link", { name: "Ver solo esas" });
  test.skip((await link.count()) === 0, "no brand shows its slug");
  await link.click();
  await expect(page).toHaveURL(/filtro=sin-corregir/);
});
