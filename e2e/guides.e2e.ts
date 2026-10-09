import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/presentaciones", h1: "¿Frasco entero o decant?" },
  { path: "/concentraciones", h1: "EDT, EDP, Parfum: ¿qué cambia?" },
  { path: "/como-comprar", h1: "Cómo comprar" },
  { path: "/contacto", h1: "Contacto" },
];

for (const { path, h1 } of PAGES) {
  test(`${path} has one h1`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
  });

  test(`no horizontal overflow on mobile at ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}

test("the two guides link to each other", async ({ page }) => {
  await page.goto("/presentaciones");
  await expect(
    page.locator('main a[href="/concentraciones"]').first(),
  ).toBeAttached();
  await page.goto("/concentraciones");
  await expect(
    page.locator('main a[href="/presentaciones"]').first(),
  ).toBeAttached();
});

test("/presentaciones never mentions testers", async ({ page }) => {
  await page.goto("/presentaciones");
  await expect(page.locator("main")).not.toHaveText(/tester/i);
});

test("the guide nav is visible on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ["/presentaciones", "/concentraciones"]) {
    await page.goto(path);
    await expect(
      page.getByRole("navigation", { name: "En esta guía" }),
    ).toBeVisible();
  }
});

test("/como-comprar links to the decant guide and has no testers", async ({
  page,
}) => {
  await page.goto("/como-comprar");
  await expect(
    page.getByRole("link", { name: "Frasco o decant" }).first(),
  ).toHaveAttribute("href", "/presentaciones");
  await expect(page.locator("main")).not.toHaveText(/tester/i);
});

test("/contacto has an external WhatsApp link and a link to /como-comprar", async ({
  page,
}) => {
  await page.goto("/contacto");
  const whatsapp = page
    .locator("main")
    .getByRole("link", { name: "Escribinos por WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(whatsapp).toHaveAttribute("target", "_blank");
  await expect(
    page.locator('main a[href="/como-comprar"]').first(),
  ).toBeAttached();
});

test("the current guide is marked in the desktop nav and the nav stays visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, name] of [
    ["/presentaciones", "Frasco o decant"],
    ["/concentraciones", "Concentraciones"],
  ]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "En esta guía" });
    await expect(nav.getByRole("link", { name })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(nav).toBeInViewport();
  }
});

test("the concentrations table scrolls inside its container on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concentraciones");
  const container = page.locator('[data-slot="table-container"]');
  const scrolls = await container.evaluate(
    (el) => el.scrollWidth > el.clientWidth,
  );
  expect(scrolls).toBe(true);
});

test("the mobile menu links to /concentraciones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(
    page.getByRole("link", { name: "Concentraciones" }),
  ).toHaveAttribute("href", "/concentraciones");
});

test("the desktop header nav has exactly 3 links", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link"),
  ).toHaveCount(3);
});
