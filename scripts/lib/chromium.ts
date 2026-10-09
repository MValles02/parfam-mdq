/**
 * Launches and tears down the headless Chromium that scripts/smoke.ts drives
 * over the Chrome DevTools Protocol, with a throwaway profile directory.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseDevToolsActivePort } from "./smoke-checks";

const CHROMIUM_ARGS = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--remote-debugging-port=0",
];
const DEVTOOLS_PORT_TIMEOUT_MS = 10_000;
const DEVTOOLS_PORT_POLL_INTERVAL_MS = 100;
const BROWSER_EXIT_TIMEOUT_MS = 5_000;

export interface ChromiumProcess {
  /** Absent only while cleaning up after a failed launch. */
  proc?: ChildProcess;
  userDataDir: string;
}

export async function launchChromium(
  chromiumPath: string,
): Promise<ChromiumProcess> {
  if (!existsSync(chromiumPath)) {
    throw new Error(
      `Chromium binary not found at ${chromiumPath}; set CHROMIUM_PATH.`,
    );
  }
  const userDataDir = mkdtempSync(path.join(tmpdir(), "smoke-chromium-"));
  try {
    // detached: true makes Chromium the leader of its own process group, so
    // stopChromium() can kill it and every child it spawns (network service,
    // renderers) in one signal instead of leaving them to rewrite files into
    // the profile dir after the browser itself is gone.
    const proc = spawn(
      chromiumPath,
      [...CHROMIUM_ARGS, `--user-data-dir=${userDataDir}`],
      { stdio: "ignore", detached: true },
    );
    proc.unref();
    return { proc, userDataDir };
  } catch (err) {
    // spawn() failed after the temp profile dir was already created: remove
    // it here, since the caller never gets a ChromiumProcess to stop.
    await stopChromium({ userDataDir });
    throw err;
  }
}

/** Waits for the running browser to publish its DevTools WebSocket URL. */
export async function readBrowserWsUrl(userDataDir: string): Promise<string> {
  const file = path.join(userDataDir, "DevToolsActivePort");
  const deadline = Date.now() + DEVTOOLS_PORT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (existsSync(file)) {
      const wsUrl = parseDevToolsActivePort(readFileSync(file, "utf8"));
      if (wsUrl) return wsUrl;
    }
    await sleep(DEVTOOLS_PORT_POLL_INTERVAL_MS);
  }
  throw new Error("Timed out waiting for Chromium's DevToolsActivePort file.");
}

/** Kills the browser's whole process group, then removes its profile directory. */
export async function stopChromium({
  proc,
  userDataDir,
}: ChromiumProcess): Promise<void> {
  if (proc?.pid) {
    try {
      // Negative pid targets the whole process group led by proc (see the
      // detached: true spawn above), not just the browser's own top process.
      process.kill(-proc.pid, "SIGKILL");
    } catch {}
    if (proc.exitCode === null && proc.signalCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, BROWSER_EXIT_TIMEOUT_MS);
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
