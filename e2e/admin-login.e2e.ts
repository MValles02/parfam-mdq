import { expect, test } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

test("admin can log in and reach the panel", async ({ page }) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /^Hola/ }),
  ).toBeVisible();
});

test("wrong password shows the error and stays on the login page", async ({
  page,
}) => {
  test.skip(!email, "ADMIN_SEED_EMAIL not set");

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("Mostrar toggles the password visibility", async ({ page }) => {
  await page.goto("/admin/login");
  const input = page.locator("#password");
  const toggle = page.getByRole("button", { name: "Mostrar" });
  await expect(input).toHaveAttribute("type", "password");
  await toggle.click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("login fits a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
