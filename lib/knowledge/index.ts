import type { ConceptHint, TechKnowledge } from "./types";
import type { Locale } from "@/types/database";
import { getKBFromDB, syncSeedToDB } from "@/server/actions/knowledge";

// Static imports — seed fallback for techs without DB entries
import { NEXTJS_KNOWLEDGE } from "./data/nextjs";
import { REACT_KNOWLEDGE } from "./data/react";
import { TYPESCRIPT_KNOWLEDGE } from "./data/typescript";
import { SUPABASE_KNOWLEDGE } from "./data/supabase";
import { TAILWIND_KNOWLEDGE } from "./data/tailwind";
import { VUE_KNOWLEDGE } from "./data/vue";
import { ANGULAR_KNOWLEDGE } from "./data/angular";
import { SVELTE_KNOWLEDGE } from "./data/svelte";
import { GO_KNOWLEDGE } from "./data/go";
import { SWIFT_KNOWLEDGE } from "./data/swift";
import { RUST_KNOWLEDGE } from "./data/rust";
import { PYTHON_KNOWLEDGE } from "./data/python";
import { JAVA_KNOWLEDGE } from "./data/java";
import { KOTLIN_KNOWLEDGE } from "./data/kotlin";
import { FLUTTER_KNOWLEDGE } from "./data/flutter";
import { DJANGO_KNOWLEDGE } from "./data/django";
import { SPRING_BOOT_KNOWLEDGE } from "./data/spring-boot";
import { EXPRESS_KNOWLEDGE } from "./data/express";
import { FASTAPI_KNOWLEDGE } from "./data/fastapi";
import { NESTJS_KNOWLEDGE } from "./data/nestjs";

const ALL_KNOWLEDGE: TechKnowledge[] = [
  NEXTJS_KNOWLEDGE,
  REACT_KNOWLEDGE,
  TYPESCRIPT_KNOWLEDGE,
  SUPABASE_KNOWLEDGE,
  TAILWIND_KNOWLEDGE,
  VUE_KNOWLEDGE,
  ANGULAR_KNOWLEDGE,
  SVELTE_KNOWLEDGE,
  GO_KNOWLEDGE,
  SWIFT_KNOWLEDGE,
  RUST_KNOWLEDGE,
  PYTHON_KNOWLEDGE,
  JAVA_KNOWLEDGE,
  KOTLIN_KNOWLEDGE,
  FLUTTER_KNOWLEDGE,
  DJANGO_KNOWLEDGE,
  SPRING_BOOT_KNOWLEDGE,
  EXPRESS_KNOWLEDGE,
  FASTAPI_KNOWLEDGE,
  NESTJS_KNOWLEDGE,
];

// Index by normalized tech name for fast seed lookup
const KB_INDEX = new Map<string, TechKnowledge>();
for (const tk of ALL_KNOWLEDGE) {
  KB_INDEX.set(tk.technology_name.toLowerCase(), tk);
}

// ─── In-Memory Cache (5-minute TTL, max 500 entries) ────────────────

interface CacheEntry {
  concepts: ConceptHint[];
  cachedAt: number;
}
const KB_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 500;

/** Evict expired entries when cache exceeds max size */
function evictStaleCache(): void {
  if (KB_CACHE.size <= CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of KB_CACHE) {
    if (now - entry.cachedAt >= CACHE_TTL_MS) {
      KB_CACHE.delete(key);
    }
  }
  // If still over limit after TTL eviction, drop oldest entries
  if (KB_CACHE.size > CACHE_MAX_ENTRIES) {
    const sorted = [...KB_CACHE.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toRemove = sorted.slice(0, KB_CACHE.size - CACHE_MAX_ENTRIES);
    for (const [key] of toRemove) {
      KB_CACHE.delete(key);
    }
  }
}

/**
 * Get KB hints for a technology.
 * 3-tier lookup: in-memory cache → DB → static seed fallback (ko only).
 */
export async function getKBHints(techName: string, locale: Locale = "ko"): Promise<ConceptHint[]> {
  const normalized = techName.toLowerCase().trim();
  const cacheKey = `${normalized}:${locale}`;

  // 1. In-memory cache
  const cached = KB_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.concepts;
  }

  // 2. DB lookup
  try {
    const result = await getKBFromDB(techName, locale);
    if (result && result.concepts.length > 0) {
      KB_CACHE.set(cacheKey, { concepts: result.concepts, cachedAt: Date.now() });
      evictStaleCache();
      return result.concepts;
    }
  } catch (err) {
    console.error("[knowledge] DB lookup failed, falling back to seed:", err);
  }

  // 3. Static seed fallback (ko only — no English seeds)
  if (locale === "ko") {
    const tk = KB_INDEX.get(normalized);
    const concepts = tk?.concepts ?? [];
    if (concepts.length > 0) {
      KB_CACHE.set(cacheKey, { concepts, cachedAt: Date.now() });
      evictStaleCache();

      // Lazy sync: write seed to DB in background (non-blocking)
      syncSeedToDB(
        tk!.technology_name,
        normalized,
        tk!.version,
        concepts,
        locale,
      ).catch((err) => {
        console.error("[knowledge] Background seed sync failed:", err);
      });
    }
    return concepts;
  }

  return [];
}

/**
 * Get all KB technologies for structure prompt.
 * Lets the LLM know which technologies have KB coverage.
 */
export function getKBTechNames(): string[] {
  return ALL_KNOWLEDGE.map((tk) => tk.technology_name);
}

/**
 * Sync all static seeds to DB (ko locale).
 * Skips techs that already exist in DB. Safe to call multiple times.
 * Returns count of newly inserted rows.
 */
export async function syncAllSeedsToDB(): Promise<number> {
  let synced = 0;
  for (const tk of ALL_KNOWLEDGE) {
    const normalized = tk.technology_name.toLowerCase();
    const inserted = await syncSeedToDB(
      tk.technology_name,
      normalized,
      tk.version,
      tk.concepts,
      "ko",
    );
    if (inserted) synced++;
  }
  if (synced > 0) {
    console.log(`[knowledge] Seed sync complete: ${synced}/${ALL_KNOWLEDGE.length} inserted`);
  }
  return synced;
}
