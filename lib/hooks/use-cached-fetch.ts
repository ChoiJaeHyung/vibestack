"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Module-level cache (shared across all hook instances) ──────────

const cache = new Map<string, { data: unknown; timestamp: number }>();
const STALE_TIME = 30_000; // 30s — show cached, no refetch
const CACHE_TTL = 5 * 60_000; // 5min — show cached + background refetch
const INVALIDATE_EVENT = "vibeuniv:cache-invalidate";

// ─── Cache invalidation helper ──────────────────────────────────────

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(INVALIDATE_EVENT, { detail: { prefix } }),
    );
  }
}

// ─── Types ──────────────────────────────────────────────────────────

interface UseCachedFetchReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  mutate: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
): UseCachedFetchReturn<T> {
  const [data, setData] = useState<T | undefined>(() => {
    const entry = cache.get(key);
    return entry ? (entry.data as T) : undefined;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !cache.has(key));
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep fetcher ref stable to avoid re-running effect on every render
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const keyRef = useRef(key);
  keyRef.current = key;

  const doFetch = useCallback(
    async (showLoading: boolean) => {
      const currentKey = keyRef.current;
      if (showLoading) setIsLoading(true);
      setIsValidating(true);
      setError(null);

      try {
        const result = await fetcherRef.current();
        cache.set(currentKey, { data: result, timestamp: Date.now() });
        setData(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
      } finally {
        if (showLoading) setIsLoading(false);
        setIsValidating(false);
      }
    },
    [], // stable — uses refs internally
  );

  // Initial fetch + stale-while-revalidate logic
  useEffect(() => {
    const entry = cache.get(key);
    if (entry) {
      // Serve cached data immediately
      setData(entry.data as T);
      setIsLoading(false);

      const age = Date.now() - entry.timestamp;
      if (age < STALE_TIME) {
        // Fresh — no refetch needed
        return;
      }
      if (age < CACHE_TTL) {
        // Stale but within TTL — background revalidate
        doFetch(false);
        return;
      }
      // Expired — refetch with loading state
      cache.delete(key);
    }

    // No cache or expired — full fetch
    setIsLoading(true);
    doFetch(true);
  }, [key, doFetch]);

  // Listen for invalidation events from other components / mutations
  useEffect(() => {
    function handleInvalidate(e: Event) {
      const detail = (e as CustomEvent<{ prefix?: string }>).detail;
      const prefix = detail?.prefix;

      if (!prefix || key.startsWith(prefix)) {
        cache.delete(key);
        doFetch(false);
      }
    }

    window.addEventListener(INVALIDATE_EVENT, handleInvalidate);
    return () => {
      window.removeEventListener(INVALIDATE_EVENT, handleInvalidate);
    };
  }, [key, doFetch]);

  // Manual mutate (refetch)
  const mutate = useCallback(() => {
    cache.delete(keyRef.current);
    doFetch(false);
  }, [doFetch]);

  return { data, isLoading, isValidating, error, mutate };
}
