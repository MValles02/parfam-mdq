import { randomInt } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";

const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

// Login throttling is keyed by Cloudflare's client IP header, so these specs
// use their own random IPs and never lock out admin-login.e2e.ts.
const randomIp = () =>
  Array.from({ length: 4 }, () => randomInt(1, 255)).join(".");

async function newPageFromIp(
  browser: Browser,
  baseURL: string | undefined,
  ip: string,
) {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "cf-connecting-ip": ip },
  });
  // A client can forge X-Forwarded-For freely; it must not buy a fresh bucket.
  await context.route("**/*", (route) =>
    route.continue({
      headers: { ...route.request().headers(), "x-forwarded-for": randomIp() },
    }),
  );
  return context.newPage();
}

async function attemptLogin(
  page: Awaited<ReturnType<typeof newPageFromIp>>,
  attemptEmail: string,
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(attemptEmail);
  await page.getByLabel("Contraseña").fill("wrong-password-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  return page.locator('p[role="alert"]');
}

test("login is throttled per client IP, not per forwarded-for header", async ({
  browser,
  baseURL,
}) => {
  const attackerEmail = `throttle-${randomInt(1e9)}@example.test`;
  const page = await newPageFromIp(browser, baseURL, randomIp());

  for (let attempt = 0; attempt < 5; attempt++) {
    await expect(await attemptLogin(page, attackerEmail)).toHaveText(
      "Email o contraseña incorrectos.",
    );
  }
  await expect(await attemptLogin(page, attackerEmail)).toContainText(
    "Demasiados intentos. Probá de nuevo en",
  );

  // A different client IP starts with a clean bucket.
  const freshPage = await newPageFromIp(browser, baseURL, randomIp());
  await expect(await attemptLogin(freshPage, attackerEmail)).toHaveText(
    "Email o contraseña incorrectos.",
  );
});

test("admin image upload PUTs a signed, size-and-type-pinned URL to R2", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set",
  );

  const puts: { url: string; contentType: string | undefined }[] = [];
  await page.route("https://*.r2.cloudflarestorage.com/**", async (route) => {
    const request = route.request();
    puts.push({
      url: request.url(),
      contentType: request.headers()["content-type"],
    });
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*" },
      body: "",
    });
  });

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/admin/productos/nuevo");
  await page.getByRole("button", { name: "Cargalo a mano" }).click();
  // Smallest valid JPEG (SOI + EOI); the server only checks the declared type.
  await page.locator('input[type="file"]').setInputFiles({
    name: "foto.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });

  await expect.poll(() => puts.length).toBe(1);
  const url = new URL(puts[0]!.url);
  expect(url.pathname).toMatch(
    /^(\/[^/]+)?\/products\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/,
  );
  const signedHeaders = url.searchParams.get("X-Amz-SignedHeaders") ?? "";
  expect(signedHeaders).toContain("content-length");
  expect(signedHeaders).toContain("content-type");
  expect(puts[0]!.contentType).toBe("image/jpeg");
});
