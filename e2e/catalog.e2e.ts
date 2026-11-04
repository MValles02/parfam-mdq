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

  await page.goto("/?q=Hombre");
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Hombre" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixture Eau de Prueba Mujer" }),
  ).toHaveCount(0);
});

test("a search without results shows the empty state", async ({ page }) => {
  await page.goto("/?q=zzzz");

  await expect(page.getByText("No encontramos “zzzz”.")).toBeVisible();
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

const fixtureHeading = /^Fixture Eau de Prueba (Mujer|Hombre|Unisex)$/;

test("catalog prices are correct: cheapest active variant and sort order", async ({
  page,
}) => {
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

  const card = page.getByRole("link").filter({
    has: page.getByRole("heading", { name: mujer }),
  });
  await expect(card).toContainText("desde");
  await expect(card).toContainText("8.000");
  await expect(card).not.toContainText("45.000");
});
