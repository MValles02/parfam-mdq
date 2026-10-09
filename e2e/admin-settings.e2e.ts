import { expect, test } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

// Never saves: settings are global state shared with every other spec.
test("admin edits the WhatsApp template, sees the preview, discards, and the page fits at 390", async ({
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

  await page.goto("/admin/configuracion");
  await page.waitForLoadState("networkidle");
  const template = page.getByLabel("Plantilla del mensaje");
  const original = await template.inputValue();
  const preview = page.getByTestId("whatsapp-preview");
  await expect(page.getByText("Cambios sin guardar")).toHaveCount(0);

  await template.fill(
    "Hola {{marca}}, soy {{nombre}} (E2E-PREVIEW) {{numero}}",
  );
  await expect(preview).toContainText("E2E-PREVIEW");
  await expect(preview).toContainText("PM-0046");
  await expect(page.getByText("Cambios sin guardar")).toBeVisible();

  await page.getByRole("button", { name: "Descartar" }).click();
  await expect(template).toHaveValue(original);
  await expect(page.getByText("Cambios sin guardar")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/configuracion");
  await page.waitForLoadState("networkidle");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

// Never saves: settings are global state shared with every other spec.
test("a variable chip appends its token and the preview shows the typed text", async ({
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

  await page.goto("/admin/configuracion");
  await page.waitForLoadState("networkidle");
  const template = page.getByLabel("Plantilla del mensaje");
  await template.fill("E2E-CHIP ");
  await page.getByRole("button", { name: "{{numero}}" }).click();
  await expect(template).toHaveValue("E2E-CHIP {{numero}}");
  await expect(page.getByTestId("whatsapp-preview")).toHaveText(
    "E2E-CHIP PM-0046",
  );
});
