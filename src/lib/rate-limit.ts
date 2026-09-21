import { LRUCache } from "lru-cache";

/**
 * In-memory rate limit. It works because the application has one replica. A
 * horizontally scaled deployment needs Redis because each instance would keep
 * its own counter.
 */
const buckets = new LRUCache<string, number[]>({
  max: 5_000,
  ttl: 1000 * 60 * 15,
});

export interface RateLimitResult {
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
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

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
