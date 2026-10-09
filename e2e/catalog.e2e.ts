import { expect, test } from "@playwright/test";
import {
  FIXTURE_DRAFT,
  FIXTURE_INACTIVE_ONLY,
  FIXTURE_LISTED,
} from "../scripts/lib/fixture-catalog";

test("catalog lists only published products with active variants", async ({
  page,
}) => {
  await page.goto("/");

  for (const { name } of FIXTURE_LISTED) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: FIXTURE_DRAFT.name }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: FIXTURE_INACTIVE_ONLY.name }),
  ).toHaveCount(0);
});

test("searching from the home page opens the catalog view", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Buscar fragancia o marca" })
    .fill("Hombre");

  await expect(page).toHaveURL(/q=Hombre/);
  await expect(page.getByRole("heading", { name: "Fragancias" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Hombre" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  ).toHaveCount(0);
});

test("a search without results offers to ask on WhatsApp", async ({ page }) => {
  await page.goto("/?q=zzzz");

  await expect(page.getByText("No encontramos “zzzz”.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Preguntar por WhatsApp" }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\//);
});

test("the Decant presentation filter narrows the catalog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Decant" }).click();

  await expect(page).toHaveURL(/presentacion=DECANT/);
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Hombre" }),
  ).toHaveCount(0);
});

test("the header search on a product page lands on the catalog search", async ({
  page,
}) => {
  await page.goto("/producto/fixture-eau-de-prueba-mujer");
  const search = page.getByRole("textbox", {
    name: "Buscar fragancia o marca",
  });
  await search.fill("Unisex");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/\?q=Unisex$/);
});

test("a home shortcut applies its filter", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Atajos" })
    .getByRole("link", { name: "Para él" })
    .click();

  await expect(page).toHaveURL(/genero=MEN/);
});

test("the mobile menu filters the catalog by gender", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Para ella" })
    .click();

  await expect(page).toHaveURL(/genero=WOMEN/);
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Hombre" }),
  ).toHaveCount(0);
});

test("the home page has the logo as its only h1", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Perfumería",
  );
});

test("the filtered catalog has a single h1 named Fragancias", async ({
  page,
}) => {
  await page.goto("/?genero=MEN");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fragancias",
  );
});

for (const url of ["/", "/?genero=MEN"]) {
  test(`no horizontal overflow on mobile at ${url}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}

test("the mobile menu has one external WhatsApp link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();

  const links = page
    .getByRole("dialog")
    .getByRole("link", { name: "Escribinos por WhatsApp" });
  await expect(links).toHaveCount(1);
  await expect(links).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(links).toHaveAttribute("target", "_blank");
});

test("removing the gender chip returns to the home view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?genero=MEN");
  await page.getByRole("button", { name: "Quitar filtro Para él" }).click();

  await expect(page).not.toHaveURL(/genero=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Perfumería",
  );
});

test("the sort control defaults to Destacados on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?genero=MEN");

  await expect(
    page.getByRole("combobox", { name: "Ordenar" }).filter({ visible: true }),
  ).toHaveText("Destacados");
});

test("a legacy ?presentacion=TESTER URL is ignored and offers no Tester filter", async ({
  page,
}) => {
  const response = await page.goto("/?presentacion=TESTER");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Hombre" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tester" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Decant" })).toBeVisible();
});

const fixtureHeading = /^Fixture Eau de Prueba (Mujer|Hombre|Unisex)$/;

test("product card shows the cheapest active variant as the starting price", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByRole("link").filter({
    has: page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  });
  await expect(card).toContainText("desde");
  await expect(card).toContainText("8.000");
  await expect(card).not.toContainText("45.000");
});

test("catalog sorts by price and by name", async ({ page }) => {
  const order = async (sort: string) => {
    await page.goto(`/?orden=${sort}`);
    const headings = page.getByRole("heading", { name: fixtureHeading });
    await expect(headings).toHaveCount(3);
    return headings.allTextContents();
  };
  const mujer = "Fixture Eau de Prueba Mujer";
  const hombre = "Fixture Eau de Prueba Hombre";
  const unisex = "Fixture Eau de Prueba Unisex";

  expect(await order("precio-asc")).toEqual([mujer, unisex, hombre]);
  expect(await order("precio-desc")).toEqual([hombre, unisex, mujer]);
  expect(await order("nombre")).toEqual([hombre, mujer, unisex]);
});
