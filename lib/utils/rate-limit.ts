/**
 * Rate limiter with Redis (Upstash) support and in-memory fallback.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * uses distributed Redis for correct multi-instance rate limiting.
 * Otherwise, falls back to in-memory (single-instance only).
 *
 * Setup:
 *   1. Create free Upstash Redis at https://upstash.com
 *   2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const WINDOW_MS = 60_000; // 1 minute

// ─── Redis Rate Limiter (distributed) ─────────────────────────────

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

async function redisRateLimit(
  key: string,
  limit: number,
): Promise<RateLimitResult> {
  const windowKey = `rl:${key}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const resetAt = (Math.floor(Date.now() / WINDOW_MS) + 1) * WINDOW_MS;

  const response = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, String(WINDOW_MS)],
    ]),
  });

  if (!response.ok) {
    // Redis error — fall back to in-memory limiter instead of fail-open
    return memoryRateLimit(key, limit);
  }

  const results = (await response.json()) as Array<{ result: number }>;
  const count = results[0]?.result ?? 1;

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(resetAt / 1000),
  };
}

// ─── In-Memory Rate Limiter (single-instance fallback) ────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function memoryRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup
  if (now - lastCleanup > WINDOW_MS) {
    lastCleanup = now;
    for (const [k, entry] of store) {
      if (now >= entry.resetAt) store.delete(k);
    }
  }

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + WINDOW_MS;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, reset: Math.ceil(resetAt / 1000) };
  }

  entry.count++;

  if (entry.count > limit) {
    return { success: false, limit, remaining: 0, reset: Math.ceil(entry.resetAt / 1000) };
  }

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}

// ─── Public API ───────────────────────────────────────────────────

export function rateLimit(key: string, limit: number): RateLimitResult | Promise<RateLimitResult> {
  if (useRedis) {
    return redisRateLimit(key, limit);
  }
  return memoryRateLimit(key, limit);
}
