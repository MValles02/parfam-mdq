import { LRUCache } from "lru-cache";

/**
 * Rate limit en memoria. Alcanza porque la app corre con una sola réplica;
 * si algún día se escala horizontalmente hay que moverlo a Redis, porque
 * cada instancia tendría su propio contador.
 */
const buckets = new LRUCache<string, number[]>({
  max: 5_000,
  ttl: 1000 * 60 * 15,
});

export interface RateLimitResult {
  ok: boolean;
  /** Segundos que faltan para poder reintentar, cuando `ok` es false. */
  retryAfter: number;
}

/**
 * Ventana deslizante: permite `limit` intentos cada `windowMs`.
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

/** Borra el contador de una clave — se usa tras un login exitoso. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
