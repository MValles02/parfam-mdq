/**
 * Headless smoke check (`pnpm smoke`; see "Local smoke check" in
 * docs/deployment.md).
 *
 * Loads every store and admin page in real headless Chromium, driven over
 * the Chrome DevTools Protocol (CDP) through Node's global `WebSocket` (see
 * scripts/lib/cdp.ts) — no Playwright/Puppeteer dependency. Fails on CSP
 * violations (reported as "Refused to ..." console/log entries), console
 * errors, uncaught exceptions, or an unexpected main-document HTTP status
 * (see scripts/lib/smoke-checks.ts).
 *
 * Requires a running production server and the fixture catalog:
 *
 *   pnpm db:up && pnpm db:seed && pnpm db:seed:fixtures && pnpm build
 *   pnpm start   # in another shell
 *   pnpm smoke
 *
 * Env vars:
 *   SMOKE_BASE_URL         base URL of the running server, default http://localhost:3000
 *   SMOKE_ADMIN_EMAIL      default ADMIN_SEED_EMAIL; admin routes are skipped
 *                          with a warning (not a failure) if no credentials resolve
 *   SMOKE_ADMIN_PASSWORD   default ADMIN_SEED_PASSWORD
 *   CHROMIUM_PATH          path to a Chromium binary, default /usr/bin/chromium
 *   SMOKE_TIMEOUT_MS       overall run timeout in ms, default 180000; a hang
 *                          past this prints "smoke: global timeout" and
 *                          exits 1 after the usual cleanup
 *
 * Exits 0 when every visited page passes, 1 otherwise.
 */
import { setTimeout as sleep } from "node:timers/promises";
import { connectCdp } from "./lib/cdp";
import {
  evalExpression,
  openPageSession,
  waitForEvent,
  type PageSession,
} from "./lib/cdp-page";
import { launchChromium, readBrowserWsUrl, stopChromium } from "./lib/chromium";
import {
  FIXTURE_DRAFT,
  FIXTURE_INACTIVE_ONLY,
  FIXTURE_LISTED,
} from "./lib/fixture-catalog";
import {
  collectPageFailures,
  emptyPageBuffers,
  formatCheckResult,
} from "./lib/smoke-checks";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_CHROMIUM_PATH = "/usr/bin/chromium";
const DEFAULT_SMOKE_TIMEOUT_MS = 180_000;

const BASE_URL = (process.env.SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(
  /\/$/,
  "",
);
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || DEFAULT_CHROMIUM_PATH;
const SMOKE_TIMEOUT_MS =
  Number(process.env.SMOKE_TIMEOUT_MS) || DEFAULT_SMOKE_TIMEOUT_MS;

const PAGE_TIMEOUT_MS = 15_000;
/** Wait after the load event so late console errors and CSP reports arrive. */
const SETTLE_MS = 1_500;
const LOGIN_TIMEOUT_MS = 10_000;
const LOGIN_POLL_INTERVAL_MS = 200;

const STORE_PAGES: { path: string; status?: number }[] = [
  { path: "/" },
  ...FIXTURE_LISTED.map(({ slug }) => ({ path: `/producto/${slug}` })),
  { path: "/carrito" },
  { path: "/checkout" },
  { path: "/como-comprar" },
  { path: "/contacto" },
  { path: "/presentaciones" },
  { path: "/concentraciones" },
  { path: `/producto/${FIXTURE_DRAFT.slug}`, status: 404 },
  // Published, but its only variant is inactive: still viewable (it's not a
  // draft), just never offered for purchase.
  { path: `/producto/${FIXTURE_INACTIVE_ONLY.slug}` },
];

const ADMIN_STATIC_PAGES = [
  "/admin",
  "/admin/productos",
  "/admin/productos/nuevo",
  "/admin/marcas",
  "/admin/pedidos",
  "/admin/configuracion",
];

const EXTRACT_PRODUCT_ID_EXPR = `(function () {
  const links = Array.from(document.querySelectorAll('a[href^="/admin/productos/"]'));
  const href = links.map((a) => a.getAttribute("href")).find((h) => h && h !== "/admin/productos/nuevo");
  return href ? href.split("/").pop() : null;
})()`;

/** Pass/fail counts for the whole run. */
class CheckTally {
  passed = 0;
  failed = 0;

  /** Counts one check and passes its result through. */
  record(ok: boolean): boolean {
    if (ok) this.passed++;
    else this.failed++;
    return ok;
  }

  /** Prints and counts a check that is not a page visit (those print their own line). */
  report(label: string, failures: string[]): void {
    console.log(formatCheckResult(label, failures));
    this.record(failures.length === 0);
  }
}

async function main() {
  const browser = await launchChromium(CHROMIUM_PATH);
  let exitCode = 0;

  // Watchdog for the whole run, not per-call: a single hung page load or
  // CDP round-trip would otherwise block main() forever.
  const watchdog = setTimeout(async () => {
    console.error("smoke: global timeout");
    await stopChromium(browser);
    process.exit(1);
  }, SMOKE_TIMEOUT_MS);

  try {
    const cdp = connectCdp(await readBrowserWsUrl(browser.userDataDir));
    await cdp.ready;
    const session = await openPageSession(cdp);

    const tally = new CheckTally();
    for (const page of STORE_PAGES) {
      tally.record(await visitPage(session, page.path, page.status));
    }

    const credentials = readAdminCredentials();
    if (!credentials) {
      console.warn(
        "warn: no admin credentials (SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD or ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD); skipping /admin routes.",
      );
    } else {
      await checkAdminPages(session, tally, credentials);
    }

    console.log(`\n${tally.passed} ok, ${tally.failed} failed.`);
    exitCode = tally.failed > 0 ? 1 : 0;
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    await stopChromium(browser);
  }

  process.exit(exitCode);
}

/** Navigates to `urlPath`, prints its ok/FAIL line, and returns whether it passed. */
async function visitPage(
  session: PageSession,
  urlPath: string,
  expectedStatus = 200,
): Promise<boolean> {
  const { cdp, sessionId, buffers } = session;
  Object.assign(buffers, emptyPageBuffers());

  const failures: string[] = [];
  try {
    const loaded = waitForEvent(
      session,
      "Page.loadEventFired",
      PAGE_TIMEOUT_MS,
    );
    await cdp.send(
      "Page.navigate",
      { url: `${BASE_URL}${urlPath}` },
      sessionId,
    );
    await loaded;
  } catch (err) {
    failures.push(`navigation error: ${(err as Error).message}`);
  }
  await sleep(SETTLE_MS);

  const pathname = await evalExpression(session, "window.location.pathname");
  failures.push(
    ...collectPageFailures({ urlPath, pathname, expectedStatus, buffers }),
  );

  console.log(formatCheckResult(urlPath, failures));
  return failures.length === 0;
}

type AdminCredentials = { email: string; password: string };

function readAdminCredentials(): AdminCredentials | null {
  const email = process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL;
  const password =
    process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;
  return email && password ? { email, password } : null;
}

/** Logs in through the real form, then visits every admin page plus one product's edit page. */
async function checkAdminPages(
  session: PageSession,
  tally: CheckTally,
  credentials: AdminCredentials,
): Promise<void> {
  if (!tally.record(await visitPage(session, "/admin/login"))) return;

  await fillAndSubmitLogin(session, credentials);
  const login = await waitForLoginResult(session);
  tally.report("/admin/login (submit)", login.ok ? [] : [login.error]);
  if (!login.ok) return;

  let productId: string | null = null;
  for (const adminPath of ADMIN_STATIC_PAGES) {
    tally.record(await visitPage(session, adminPath));
    if (adminPath === "/admin/productos") {
      productId = (await evalExpression(session, EXTRACT_PRODUCT_ID_EXPR)) as
        string | null;
    }
  }

  if (productId) {
    tally.record(await visitPage(session, `/admin/productos/${productId}`));
  } else {
    tally.report("/admin/productos/<id>", [
      "no product link found on /admin/productos",
    ]);
  }
}

// Fills the real /admin/login form through the native <input> value setter
// (React ignores a plain DOM assignment) and submits it.
async function fillAndSubmitLogin(
  session: PageSession,
  { email, password }: AdminCredentials,
) {
  const expression = `(function () {
    function setValue(id, value) {
      const el = document.getElementById(id);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setValue("email", ${JSON.stringify(email)});
    setValue("password", ${JSON.stringify(password)});
    document.querySelector("form").requestSubmit();
    return true;
  })()`;
  await evalExpression(session, expression);
}

async function waitForLoginResult(
  session: PageSession,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expression = `(function () {
    const alert = document.querySelector('[role="alert"]');
    return { pathname: window.location.pathname, error: alert ? alert.textContent : null };
  })()`;
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const value = (await evalExpression(session, expression)) as {
      pathname: string;
      error: string | null;
    };
    if (value.pathname === "/admin") return { ok: true };
    if (value.error) return { ok: false, error: value.error };
    await sleep(LOGIN_POLL_INTERVAL_MS);
  }
  return { ok: false, error: "timed out waiting for /admin/login to resolve" };
}

main();
