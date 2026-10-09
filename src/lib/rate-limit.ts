import { LRUCache } from "lru-cache";

/**
 * In-memory rate limit. It works because the application has one replica. A
 * horizontally scaled deployment needs Redis because each instance would keep
 * its own counter.
 */
const MAX_TRACKED_KEYS = 5_000;

/**
 * How long an idle key keeps its hits. It must be at least the longest
 * `windowMs` any caller passes, or a key could expire while its hits still
 * count.
 */
const KEY_TTL_MS = 1000 * 60 * 15;

const buckets = new LRUCache<string, number[]>({
  max: MAX_TRACKED_KEYS,
  ttl: KEY_TTL_MS,
});

interface RateLimitResult {
  ok: boolean;
  /** Seconds before a retry is allowed when `ok` is false. */
  retryAfter: number;
}

/**
 * Sliding window that allows `limit` attempts every `windowMs`.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter(
    (hitTime) => now - hitTime < windowMs,
  );

  if (hits.length >= limit) {
    const oldest = hits[0]!;
    return {
      ok: false,
      retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000),
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfter: 0 };
}

/** Clears a key counter after a successful sign-in. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Derives the client IP for rate-limit keys from `CF-Connecting-IP` only.
 * Production traffic reaches the app through Cloudflare → Traefik, and the
 * origin firewall's DOCKER-USER chain accepts new connections to 80/443 only
 * from Cloudflare's published IP ranges (see "Runtime configuration" in
 * docs/deployment.md), so Cloudflare is guaranteed to have set this header to
 * the real client IP, overwriting whatever the client sent. `X-Forwarded-For`
 * and `X-Real-IP` are not used here because a client can set them directly;
 * trusting either lets a script rotate a fake value per request and get a
 * fresh rate-limit bucket every time. Without Cloudflare in front (e.g. local
 * development), every request falls into the shared "unknown" bucket.
 */
export function getClientIp(headers: Pick<Headers, "get">): string {
  return headers.get("cf-connecting-ip")?.trim() || "unknown";
}
