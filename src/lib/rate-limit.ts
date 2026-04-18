// Tiny in-memory sliding-window rate limiter. Best-effort: survives a single
// server instance but resets on cold starts and doesn't sync across regions.
// Good enough to stop obvious abuse and runaway loops. For production-grade
// limits, swap to Upstash/Redis.

type WindowEntry = { hits: number[]; blockedUntil?: number };
const store = new Map<string, WindowEntry>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds?: number;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  /** If the limit is exceeded, block further traffic for this long. */
  blockMs?: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const { key, limit, windowMs, blockMs } = opts;
  const now = Date.now();
  const entry = store.get(key) ?? { hits: [] };

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      ok: false,
      remaining: 0,
      limit,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  const cutoff = now - windowMs;
  entry.hits = entry.hits.filter((t) => t > cutoff);

  if (entry.hits.length >= limit) {
    entry.blockedUntil = blockMs ? now + blockMs : now + windowMs;
    store.set(key, entry);
    return {
      ok: false,
      remaining: 0,
      limit,
      retryAfterSeconds: Math.ceil(
        ((entry.blockedUntil ?? now + windowMs) - now) / 1000
      ),
    };
  }

  entry.hits.push(now);
  entry.blockedUntil = undefined;
  store.set(key, entry);
  return { ok: true, remaining: limit - entry.hits.length, limit };
}

/** Extract a stable client identifier from common Vercel/Next headers.
 *  Order:
 *    1. `x-vercel-forwarded-for` — set/signed by Vercel's edge, cannot be spoofed.
 *    2. `x-real-ip` — common proxy header.
 *    3. Last entry of `x-forwarded-for` — proxies append the real client last,
 *       so prefer the tail over the head (which is attacker-controlled).
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",").pop()!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",").pop()!.trim();
  return "unknown";
}

// Periodic GC — drop stale keys every few minutes so the map doesn't grow
// forever on a long-lived instance.
const GC_INTERVAL_MS = 10 * 60 * 1000;
if (typeof setInterval === "function") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      const lastHit = v.hits[v.hits.length - 1] ?? 0;
      if (
        (!v.blockedUntil || now > v.blockedUntil) &&
        now - lastHit > GC_INTERVAL_MS
      ) {
        store.delete(k);
      }
    }
  }, GC_INTERVAL_MS).unref?.();
}
