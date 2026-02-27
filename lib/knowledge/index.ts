import type { ConceptHint, TechKnowledge } from "./types";
import { getKBFromDB } from "@/server/actions/knowledge";

// Static imports — seed fallback for techs without DB entries
import { NEXTJS_KNOWLEDGE } from "./data/nextjs";
import { REACT_KNOWLEDGE } from "./data/react";
import { TYPESCRIPT_KNOWLEDGE } from "./data/typescript";
import { SUPABASE_KNOWLEDGE } from "./data/supabase";
import { TAILWIND_KNOWLEDGE } from "./data/tailwind";

const ALL_KNOWLEDGE: TechKnowledge[] = [
  NEXTJS_KNOWLEDGE,
  REACT_KNOWLEDGE,
  TYPESCRIPT_KNOWLEDGE,
  SUPABASE_KNOWLEDGE,
  TAILWIND_KNOWLEDGE,
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
 * 3-tier lookup: in-memory cache → DB → static seed fallback.
 */
export async function getKBHints(techName: string): Promise<ConceptHint[]> {
  const normalized = techName.toLowerCase().trim();

  // 1. In-memory cache
  const cached = KB_CACHE.get(normalized);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.concepts;
  }

  // 2. DB lookup
  try {
    const result = await getKBFromDB(techName);
    if (result && result.concepts.length > 0) {
      KB_CACHE.set(normalized, { concepts: result.concepts, cachedAt: Date.now() });
      evictStaleCache();
      return result.concepts;
    }
  } catch (err) {
    console.error("[knowledge] DB lookup failed, falling back to seed:", err);
  }

  // 3. Static seed fallback
  const tk = KB_INDEX.get(normalized);
  const concepts = tk?.concepts ?? [];
  if (concepts.length > 0) {
    KB_CACHE.set(normalized, { concepts, cachedAt: Date.now() });
    evictStaleCache();
  }
  return concepts;
}

/**
 * Get all KB technologies for structure prompt.
 * Lets the LLM know which technologies have KB coverage.
 */
export function getKBTechNames(): string[] {
  return ALL_KNOWLEDGE.map((tk) => tk.technology_name);
}
