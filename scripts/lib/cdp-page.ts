/**
 * One browser tab driven over CDP for scripts/smoke.ts: opening it with the
 * domains the smoke check listens to, evaluating expressions in it, waiting
 * for its events, and buffering the error-level output it produces.
 */
import type { Cdp, CdpMessage } from "./cdp";
import {
  describeConsoleArg,
  emptyPageBuffers,
  type PageBuffers,
} from "./smoke-checks";

/**
 * One page/tab, its CDP session, and the log/console/network buffers
 * attached to it. Threaded through every helper instead of three separate
 * parameters.
 */
export type PageSession = { cdp: Cdp; sessionId: string; buffers: PageBuffers };

/** Opens a blank tab, enables the Page/Runtime/Log/Network domains, and starts buffering its output. */
export async function openPageSession(cdp: Cdp): Promise<PageSession> {
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

  const session: PageSession = {
    cdp,
    sessionId,
    buffers: emptyPageBuffers(),
  };
  attachBufferedListeners(session);
  return session;
}

export function waitForEvent(
  { cdp, sessionId }: PageSession,
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

/** Evaluates `expression` in the page and returns its value; a thrown page exception rejects. */
export async function evalExpression(
  { cdp, sessionId }: PageSession,
  expression: string,
): Promise<unknown> {
  const { result, exceptionDetails } = await cdp.send<{
    result: { value: unknown };
    exceptionDetails?: { text: string };
  }>("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

function attachBufferedListeners({ cdp, sessionId, buffers }: PageSession) {
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Log.entryAdded") {
      const { entry } = msg.params as {
        entry: PageBuffers["logs"][number] & { level: string };
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
