import { expect, test } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

// Settings are global state shared with every other spec: restore the original.
test("admin edits the WhatsApp template and saves it", async ({ page }) => {
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
  const template = page.getByLabel("Plantilla del mensaje");
  await expect(template).toBeVisible();
  const original = await template.inputValue();
  const edited = "Hola {{marca}}, soy {{nombre}} (E2E-SAVE) {{numero}}";

  const save = async (value: string) => {
    await template.fill(value);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Configuración guardada.")).toBeVisible();
  };

  try {
    await save(edited);
    await page.reload();
    await expect(template).toHaveValue(edited);
  } finally {
    await save(original);
  }
});
