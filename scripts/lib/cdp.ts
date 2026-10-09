/**
 * Minimal Chrome DevTools Protocol client for scripts/smoke.ts, over Node's
 * global `WebSocket` (no Playwright/Puppeteer dependency): one WebSocket,
 * requests matched to responses by numeric id, and a fan-out for unsolicited
 * events (console, network, log).
 */

export type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  sessionId?: string;
  result?: unknown;
  error?: { message: string };
};

type CdpListener = (msg: CdpMessage) => void;

export function connectCdp(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  const listeners = new Set<CdpListener>();
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
    on: (fn: CdpListener) => listeners.add(fn),
    off: (fn: CdpListener) => listeners.delete(fn),
  };
}

export type Cdp = ReturnType<typeof connectCdp>;
