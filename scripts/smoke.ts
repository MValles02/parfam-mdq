/**
 * Headless smoke check (GitHub issue #15, part B).
 *
 * Loads every store and admin page in real headless Chromium, driven over
 * the Chrome DevTools Protocol (CDP) through Node's global `WebSocket` and
 * `fetch` — no Playwright/Puppeteer dependency. Fails on CSP violations
 * (reported as "Refused to ..." console/log entries), console errors,
 * uncaught exceptions, or an unexpected main-document HTTP status.
 *
 * Requires a running production server and the fixture catalog:
 *
 *   pnpm db:up && pnpm db:seed && pnpm db:seed:fixtures && pnpm build
 *   pnpm start   # in another shell
 *   pnpm smoke
 *
 * Env vars:
 *   SMOKE_BASE_URL        base URL of the running server, default http://localhost:3000
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
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE_URL = (
  process.env.SMOKE_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const PAGE_TIMEOUT_MS = 15000;
const SETTLE_MS = 1500;
const LOGIN_TIMEOUT_MS = 10000;
const SMOKE_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS) || 180000;

// Fixture slugs are duplicated from prisma/seed-fixtures.ts rather than
// imported: that module seeds the database as a side effect of being
// imported, and can even process.exit() the caller for a non-local
// DATABASE_URL. Keep these in sync with that file by hand.
const FIXTURE_PUBLISHED_SLUGS = [
  "fixture-eau-de-prueba-mujer",
  "fixture-eau-de-prueba-hombre",
  "fixture-eau-de-prueba-unisex",
];

const STORE_PAGES: { path: string; status?: number }[] = [
  { path: "/" },
  { path: "/marca/fixture-brand-a" },
  ...FIXTURE_PUBLISHED_SLUGS.map((slug) => ({ path: `/producto/${slug}` })),
  { path: "/carrito" },
  { path: "/checkout" },
  { path: "/como-comprar" },
  { path: "/contacto" },
  { path: "/que-es-un-tester" },
  { path: "/producto/fixture-borrador", status: 404 },
  // Published, but its only variant is inactive: still viewable (it's not a
  // draft), just never offered for purchase — see FIXTURE_PRODUCTS in
  // prisma/seed-fixtures.ts.
  { path: "/producto/fixture-solo-inactivo" },
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchChromium() {
  if (!existsSync(CHROMIUM_PATH)) {
    throw new Error(
      `Chromium binary not found at ${CHROMIUM_PATH}; set CHROMIUM_PATH.`,
    );
  }
  const userDataDir = mkdtempSync(path.join(tmpdir(), "smoke-chromium-"));
  try {
    // detached: true makes Chromium the leader of its own process group, so
    // cleanup() can kill it and every child it spawns (network service,
    // renderers) in one signal instead of leaving them to rewrite files into
    // the profile dir after the browser itself is gone.
    const proc = spawn(
      CHROMIUM_PATH,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--remote-debugging-port=0",
        `--user-data-dir=${userDataDir}`,
      ],
      { stdio: "ignore", detached: true },
    );
    proc.unref();
    return { proc, userDataDir };
  } catch (err) {
    // spawn() failed after the temp profile dir was already created: remove
    // it here so main()'s cleanup (which never got a proc/userDataDir back)
    // doesn't need to.
    await cleanup(undefined, userDataDir);
    throw err;
  }
}

async function readBrowserWsUrl(userDataDir: string): Promise<string> {
  const file = path.join(userDataDir, "DevToolsActivePort");
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (existsSync(file)) {
      const [port, browserPath] = readFileSync(file, "utf8").split("\n");
      if (port?.trim() && browserPath?.trim()) {
        return `ws://127.0.0.1:${port.trim()}${browserPath.trim()}`;
      }
    }
    await sleep(100);
  }
  throw new Error("Timed out waiting for Chromium's DevToolsActivePort file.");
}

async function cleanup(
  proc: ReturnType<typeof spawn> | undefined,
  userDataDir: string,
) {
  if (proc?.pid) {
    try {
      // Negative pid targets the whole process group led by proc (see the
      // detached: true spawn above), not just the browser's own top process.
      process.kill(-proc.pid, "SIGKILL");
    } catch {}
    if (proc.exitCode === null && proc.signalCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 5000);
        proc.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }
  try {
    // maxRetries/retryDelay absorb the brief window where a just-killed
    // child process is still releasing its file handles on the profile dir.
    rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch {}
}

// Minimal CDP client: one WebSocket, request/response matched by numeric id,
// and a fan-out for unsolicited events (console, network, log).
type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  sessionId?: string;
  result?: unknown;
  error?: { message: string };
};

function connectCdp(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  const listeners = new Set<(msg: CdpMessage) => void>();
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  let nextId = 1;

  const ready = new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener(
      "error",
      () => reject(new Error("CDP WebSocket error")),
      { once: true },
    );
  });

  ws.addEventListener("message", (event) => {
    const msg: CdpMessage = JSON.parse(event.data as string);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)!;
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const listener of listeners) listener(msg);
    }
  });

  function send<T = unknown>(
    method: string,
    params: object = {},
    sessionId?: string,
  ): Promise<T> {
    const id = nextId++;
    const payload: CdpMessage = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise<T>((resolve, reject) =>
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject }),
    );
  }

  return {
    ready,
    send,
    on: (fn: (msg: CdpMessage) => void) => listeners.add(fn),
    off: (fn: (msg: CdpMessage) => void) => listeners.delete(fn),
  };
}

type Cdp = ReturnType<typeof connectCdp>;
type Buffers = {
  logs: { source: string; text: string }[];
  consoleErrors: string[];
  exceptions: string[];
  docResponses: number[];
};
const emptyBuffers = (): Buffers => ({
  logs: [],
  consoleErrors: [],
  exceptions: [],
  docResponses: [],
});

// One page/tab, its CDP session, and the log/console/network buffers
// attached to it. Threaded through every helper below instead of three
// separate parameters.
type Session = { cdp: Cdp; sessionId: string; buffers: Buffers };

function waitForEvent(
  { cdp, sessionId }: Session,
  method: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cdp.off(handler);
      reject(new Error(`timed out waiting for ${method}`));
    }, timeoutMs);
    function handler(msg: CdpMessage) {
      if (msg.sessionId === sessionId && msg.method === method) {
        clearTimeout(timer);
        cdp.off(handler);
        resolve();
      }
    }
    cdp.on(handler);
  });
}

async function evalExpression(
  { cdp, sessionId }: Session,
  expression: string,
): Promise<unknown> {
  const { result, exceptionDetails } = await cdp.send<{
    result: { value: unknown };
    exceptionDetails?: { text: string };
  }>("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

function describeConsoleArg(arg: {
  value?: unknown;
  description?: string;
  type?: string;
}): string {
  if (arg.value !== undefined) return String(arg.value);
  return arg.description || arg.type || "";
}

function attachBufferedListeners({ cdp, sessionId, buffers }: Session) {
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Log.entryAdded") {
      const { entry } = msg.params as {
        entry: Buffers["logs"][number] & { level: string };
      };
      if (entry.level === "error") buffers.logs.push(entry);
    } else if (msg.method === "Runtime.consoleAPICalled") {
      const params = msg.params as {
        type: string;
        args: Parameters<typeof describeConsoleArg>[0][];
      };
      if (params.type === "error") {
        buffers.consoleErrors.push(
          params.args.map(describeConsoleArg).join(" "),
        );
      }
    } else if (msg.method === "Runtime.exceptionThrown") {
      const { exceptionDetails } = msg.params as {
        exceptionDetails: {
          text: string;
          exception?: { description?: string };
        };
      };
      buffers.exceptions.push(
        exceptionDetails.exception?.description || exceptionDetails.text,
      );
    } else if (msg.method === "Network.responseReceived") {
      const params = msg.params as {
        type: string;
        response: { status: number };
      };
      if (params.type === "Document")
        buffers.docResponses.push(params.response.status);
    }
  });
}

async function visitPage(
  session: Session,
  urlPath: string,
  expectedStatus = 200,
): Promise<boolean> {
  const { cdp, sessionId, buffers } = session;
  Object.assign(buffers, emptyBuffers());

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

  const expectedPathname = urlPath.split("?")[0];
  const pathname = await evalExpression(session, "window.location.pathname");
  if (pathname !== expectedPathname) {
    failures.push(
      `unexpected path: expected ${expectedPathname}, got ${pathname}`,
    );
  }

  const docStatus = buffers.docResponses.at(-1);
  if (docStatus === undefined) {
    failures.push("no main document response observed");
  } else if (docStatus !== expectedStatus) {
    failures.push(
      `unexpected status: expected ${expectedStatus}, got ${docStatus}`,
    );
  }

  // A 404 navigation's own failed-request log (source "network") is expected
  // noise; a CSP violation always contains "Refused to" and always fails,
  // regardless of source.
  for (const entry of buffers.logs) {
    if (entry.source === "network" && !entry.text.includes("Refused to"))
      continue;
    failures.push(`[console] ${entry.text}`);
  }
  for (const message of buffers.consoleErrors)
    failures.push(`[console.error] ${message}`);
  for (const exception of buffers.exceptions)
    failures.push(`[exception] ${exception}`);

  const ok = failures.length === 0;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${urlPath}${ok ? "" : ` - ${failures.join("; ")}`}`,
  );
  return ok;
}

// Fills the real /admin/login form through the native <input> value setter
// (React ignores a plain DOM assignment) and submits it.
async function fillAndSubmitLogin(
  session: Session,
  email: string,
  password: string,
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
  session: Session,
): Promise<{ ok: boolean; error?: string }> {
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
    await sleep(200);
  }
  return { ok: false, error: "timed out waiting for /admin/login to resolve" };
}

async function main() {
  const { proc, userDataDir } = await launchChromium();
  let exitCode = 0;

  // Watchdog for the whole run, not per-call: a single hung page load or
  // CDP round-trip would otherwise block main() forever.
  const watchdog = setTimeout(async () => {
    console.error("smoke: global timeout");
    await cleanup(proc, userDataDir);
    process.exit(1);
  }, SMOKE_TIMEOUT_MS);

  try {
    const wsUrl = await readBrowserWsUrl(userDataDir);
    const cdp = connectCdp(wsUrl);
    await cdp.ready;

    const { targetId } = await cdp.send<{ targetId: string }>(
      "Target.createTarget",
      { url: "about:blank" },
    );
    const { sessionId } = await cdp.send<{ sessionId: string }>(
      "Target.attachToTarget",
      { targetId, flatten: true },
    );
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Log.enable", {}, sessionId);
    await cdp.send("Network.enable", {}, sessionId);

    const session: Session = { cdp, sessionId, buffers: emptyBuffers() };
    attachBufferedListeners(session);

    let passCount = 0;
    let failCount = 0;
    const record = (ok: boolean) => (ok ? passCount++ : failCount++);
    const visit = (urlPath: string, status?: number) =>
      visitPage(session, urlPath, status);

    for (const page of STORE_PAGES) record(await visit(page.path, page.status));

    const adminEmail =
      process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL;
    const adminPassword =
      process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn(
        "warn: no admin credentials (SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD or ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD); skipping /admin routes.",
      );
    } else {
      const loginPageOk = await visit("/admin/login");
      record(loginPageOk);

      if (loginPageOk) {
        await fillAndSubmitLogin(session, adminEmail, adminPassword);
        const result = await waitForLoginResult(session);

        if (!result.ok) {
          console.log(`FAIL /admin/login (submit) - ${result.error}`);
          failCount++;
        } else {
          console.log("ok   /admin/login (submit)");
          passCount++;

          let productId: string | null = null;
          for (const adminPath of ADMIN_STATIC_PAGES) {
            record(await visit(adminPath));
            if (adminPath === "/admin/productos") {
              productId = (await evalExpression(
                session,
                EXTRACT_PRODUCT_ID_EXPR,
              )) as string | null;
            }
          }

          if (productId) {
            record(await visit(`/admin/productos/${productId}`));
          } else {
            console.log(
              "FAIL /admin/productos/<id> - no product link found on /admin/productos",
            );
            failCount++;
          }
        }
      }
    }

    console.log(`\n${passCount} ok, ${failCount} failed.`);
    exitCode = failCount > 0 ? 1 : 0;
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    await cleanup(proc, userDataDir);
  }

  process.exit(exitCode);
}

main();
