import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import sharp from "sharp";
import { FIXTURE_DRAFT } from "../scripts/lib/fixture-catalog";
import { FAKE_SERVICES_ORIGIN } from "./fake-services-url";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

interface FakeObject {
  key: string;
  contentType: string;
  size: number;
}

async function countPictureFetches(request: APIRequestContext, pid: string) {
  const response = await request.get(`${FAKE_SERVICES_ORIGIN}/__requests`);
  const log = (await response.json()) as { path: string; status: number }[];
  return log.filter(
    (r) => r.path === `/mdimg/perfume/375x500.${pid}.jpg` && r.status === 200,
  ).length;
}

async function listFakeObjects(request: APIRequestContext) {
  const response = await request.get(`${FAKE_SERVICES_ORIGIN}/__objects`);
  return (await response.json()) as FakeObject[];
}

/** Searches the fixture reference by name and adopts it ("Usar estos datos"). */
async function adoptFixtureReference(page: Page, name: string) {
  await page.goto("/admin/productos/nuevo");
  // Both fixture references match this query; the accent-free prefix keeps
  // the search independent of unaccent handling.
  await page
    .getByLabel("Buscar en el catálogo de referencia")
    .fill("Fixture Referencia");
  await page.locator("form ul button").filter({ hasText: name }).click();
  await page.getByRole("button", { name: "Usar estos datos" }).click();
  await expect(page.getByText("Ficha de la fragancia")).toBeVisible();
}

test("adopting a reference imports its picture, sniffed and trimmed, into R2", async ({
  page,
  request,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);
  const before = new Set((await listFakeObjects(request)).map((o) => o.key));
  const fetchesBefore = await countPictureFetches(request, "999000001");

  await adoptFixtureReference(page, "Fixture Referencia de Prueba");
  await expect(page.getByText("Importando foto de referencia…")).toHaveCount(0);

  await expect
    .poll(async () => {
      const objects = await listFakeObjects(request);
      return objects.filter((o) => !before.has(o.key)).length;
    })
    .toBe(1);
  const [created] = (await listFakeObjects(request)).filter(
    (o) => !before.has(o.key),
  );
  expect(await countPictureFetches(request, "999000001")).toBe(
    fetchesBefore + 1,
  );
  expect(created!.key).toMatch(/^products\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/);
  // The fake serves a PNG as image/jpeg; the trimmed result is re-encoded.
  expect(created!.contentType).toBe("image/jpeg");

  // Same bucket default as playwright.config.ts.
  const bucket = process.env.R2_BUCKET || "e2e-placeholder";
  const stored = await request.get(
    `${FAKE_SERVICES_ORIGIN}/${bucket}/${created!.key}`,
  );
  const metadata = await sharp(await stored.body()).metadata();
  expect(metadata.format).toBe("jpeg");
  // The served PNG is 500x600 with a 200x400 subject; trimming plus the 16px
  // pad leaves 232x432 (see e2e/fake-services.mjs).
  expect([metadata.width, metadata.height]).toEqual([232, 432]);
});

test("adopting a reference whose picture is not an image stores nothing", async ({
  page,
  request,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);
  const before = new Set((await listFakeObjects(request)).map((o) => o.key));
  const fetchesBefore = await countPictureFetches(request, "999000002");

  await adoptFixtureReference(page, "Fixture Referencia Foto Inválida");
  await expect(
    page.getByText(
      "No pudimos traer la foto de referencia; podés subirla a mano.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Importando foto de referencia…")).toHaveCount(0);

  // The app fetched the non-image bytes (200) and rejected them by sniffing.
  expect(await countPictureFetches(request, "999000002")).toBe(
    fetchesBefore + 1,
  );
  expect(
    (await listFakeObjects(request)).filter((o) => !before.has(o.key)),
  ).toEqual([]);
});

// The fixture draft has no description (prisma/seed-fixtures.ts), so the
// publish rule deterministically blocks it.
test("the Visible switch refuses to publish a draft without a description", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);

  const name = FIXTURE_DRAFT.name;
  await page.goto(`/admin/productos?q=${encodeURIComponent(name)}`);
  const row = page.getByRole("row").filter({ hasText: name }).first();
  await row.getByRole("switch").click();

  await expect(
    page.getByText("Le falta la descripción: no se puede publicar."),
  ).toBeVisible();
  await expect(row.getByText("Borrador", { exact: true })).toBeVisible();
});

test("admin edits a draft and Guardar saves it", async ({ page }) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );
  await login(page);

  await page.goto("/admin/productos?estado=borradores");
  await page
    .getByRole("link", { name: /Fixture/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/productos\/[^/]+$/);

  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Borrador guardado.")).toBeVisible();
});
