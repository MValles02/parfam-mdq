/**
 * Pure pass/fail rules for scripts/smoke.ts: what counts as a failure on a
 * visited page, and how each result line is printed. Kept free of any
 * browser or process I/O so the rules are unit-testable.
 */

/** Error-level log entries, console errors, exceptions, and main-document statuses collected while one page loads. */
export type PageBuffers = {
  logs: { source: string; text: string }[];
  consoleErrors: string[];
  exceptions: string[];
  docResponses: number[];
};

export const emptyPageBuffers = (): PageBuffers => ({
  logs: [],
  consoleErrors: [],
  exceptions: [],
  docResponses: [],
});

/** Every message Chromium prints for a Content Security Policy violation contains this. */
const CSP_VIOLATION_MARKER = "Refused to";

/**
 * Failures observed after a navigation settled, in a fixed order: the final
 * pathname, the main-document status, then every buffered log entry, console
 * error, and exception.
 */
export function collectPageFailures({
  urlPath,
  pathname,
  expectedStatus,
  buffers,
}: {
  urlPath: string;
  pathname: unknown;
  expectedStatus: number;
  buffers: PageBuffers;
}): string[] {
  const failures: string[] = [];

  const expectedPathname = urlPath.split("?")[0];
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
  // noise; a CSP violation always fails, regardless of source.
  for (const entry of buffers.logs) {
    if (
      entry.source === "network" &&
      !entry.text.includes(CSP_VIOLATION_MARKER)
    )
      continue;
    failures.push(`[console] ${entry.text}`);
  }
  for (const message of buffers.consoleErrors)
    failures.push(`[console.error] ${message}`);
  for (const exception of buffers.exceptions)
    failures.push(`[exception] ${exception}`);

  return failures;
}

/** One result line: "ok   <label>" or "FAIL <label> - <failure>; <failure>". */
export function formatCheckResult(label: string, failures: string[]): string {
  const ok = failures.length === 0;
  return `${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : ` - ${failures.join("; ")}`}`;
}

/** Renders one CDP `Runtime.consoleAPICalled` argument the way the console would print it. */
export function describeConsoleArg(arg: {
  value?: unknown;
  description?: string;
  type?: string;
}): string {
  if (arg.value !== undefined) return String(arg.value);
  return arg.description || arg.type || "";
}

/**
 * Chromium writes its DevTools port and browser target path, one per line,
 * to `DevToolsActivePort` in the profile directory once it is listening.
 * Returns the browser WebSocket URL, or `null` while the file is still
 * incomplete.
 */
export function parseDevToolsActivePort(contents: string): string | null {
  const [port, browserPath] = contents.split("\n");
  if (port?.trim() && browserPath?.trim()) {
    return `ws://127.0.0.1:${port.trim()}${browserPath.trim()}`;
  }
  return null;
}
