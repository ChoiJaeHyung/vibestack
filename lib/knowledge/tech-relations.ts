import type { TechRelation } from "./types";

/**
 * Level 1: Technology relationship matrix.
 *
 * Each entry declares a directed relationship between two technologies.
 * - "foundation": source knowledge is prerequisite for learning target
 * - "extends": target builds directly on top of source (superset)
 * - "alternative": same role, interchangeable choice
 * - "complement": commonly used together, mutual benefit
 *
 * `strength` (0-1) indicates how tightly coupled the pair is.
 *   1.0 = inseparable (Next.js without React is meaningless)
 *   0.7 = strong (Angular heavily uses TypeScript)
 *   0.4 = moderate (Express patterns appear in FastAPI, but different language)
 */
export const TECH_RELATIONS: TechRelation[] = [
  // ── Foundation: language → framework ────────────────────────────────
  // JavaScript-based (JS itself isn't a seed, so React is the proxy root)
  { source: "typescript", target: "react",        relation: "complement",  strength: 0.8 },
  { source: "typescript", target: "angular",      relation: "foundation",  strength: 0.9 },
  { source: "typescript", target: "nest.js",      relation: "foundation",  strength: 0.9 },
  { source: "typescript", target: "next.js",      relation: "complement",  strength: 0.7 },

  // Python-based
  { source: "python",     target: "django",       relation: "foundation",  strength: 0.9 },
  { source: "python",     target: "fastapi",      relation: "foundation",  strength: 0.9 },

  // Java-based
  { source: "java",       target: "spring boot",  relation: "foundation",  strength: 0.9 },
  { source: "java",       target: "kotlin",       relation: "foundation",  strength: 0.7 },

  // Kotlin-based
  { source: "kotlin",     target: "spring boot",  relation: "complement",  strength: 0.6 },

  // ── Extends: framework → meta-framework ─────────────────────────────
  { source: "react",      target: "next.js",      relation: "extends",     strength: 1.0 },
  { source: "express.js", target: "nest.js",      relation: "extends",     strength: 0.6 },

  // ── Alternative: same role ──────────────────────────────────────────
  // Frontend frameworks
  { source: "react",      target: "vue.js",       relation: "alternative", strength: 0.8 },
  { source: "react",      target: "angular",      relation: "alternative", strength: 0.7 },
  { source: "react",      target: "svelte",       relation: "alternative", strength: 0.7 },
  { source: "vue.js",     target: "svelte",       relation: "alternative", strength: 0.7 },
  { source: "vue.js",     target: "angular",      relation: "alternative", strength: 0.6 },
  { source: "angular",    target: "svelte",       relation: "alternative", strength: 0.5 },

  // Backend frameworks (JS-based)
  { source: "express.js", target: "nest.js",      relation: "alternative", strength: 0.7 },

  // Backend frameworks (cross-language)
  { source: "express.js", target: "django",       relation: "alternative", strength: 0.4 },
  { source: "express.js", target: "fastapi",      relation: "alternative", strength: 0.4 },
  { source: "express.js", target: "spring boot",  relation: "alternative", strength: 0.4 },
  { source: "django",     target: "fastapi",      relation: "alternative", strength: 0.7 },
  { source: "django",     target: "spring boot",  relation: "alternative", strength: 0.5 },
  { source: "fastapi",    target: "spring boot",  relation: "alternative", strength: 0.4 },
  { source: "nest.js",    target: "spring boot",  relation: "alternative", strength: 0.5 },
  { source: "nest.js",    target: "django",       relation: "alternative", strength: 0.4 },

  // System languages
  { source: "go",         target: "rust",         relation: "alternative", strength: 0.5 },

  // Mobile languages
  { source: "swift",      target: "kotlin",       relation: "alternative", strength: 0.5 },
  { source: "flutter",    target: "react",        relation: "alternative", strength: 0.4 },

  // ── Complement: commonly paired ─────────────────────────────────────
  { source: "react",      target: "tailwind css", relation: "complement",  strength: 0.6 },
  { source: "next.js",    target: "supabase",     relation: "complement",  strength: 0.7 },
  { source: "next.js",    target: "tailwind css", relation: "complement",  strength: 0.6 },
  { source: "supabase",   target: "typescript",   relation: "complement",  strength: 0.5 },
  { source: "vue.js",     target: "tailwind css", relation: "complement",  strength: 0.5 },
  { source: "django",     target: "python",       relation: "foundation",  strength: 0.9 },
];

// ── Lookup helpers ────────────────────────────────────────────────────

const _index = new Map<string, TechRelation[]>();
function ensureIndex() {
  if (_index.size > 0) return;
  for (const r of TECH_RELATIONS) {
    const fwd = _index.get(r.source) ?? [];
    fwd.push(r);
    _index.set(r.source, fwd);
    // For "alternative" relations, also index the reverse direction
    if (r.relation === "alternative" || r.relation === "complement") {
      const rev = _index.get(r.target) ?? [];
      rev.push({ ...r, source: r.target, target: r.source });
      _index.set(r.target, rev);
    }
  }
}

/** Get all relations where `tech` is the source (including reverse alternatives). */
export function getRelationsFrom(tech: string): TechRelation[] {
  ensureIndex();
  return _index.get(tech.toLowerCase()) ?? [];
}

/** Get the relation between two specific techs, if any. */
export function getRelation(source: string, target: string): TechRelation | undefined {
  ensureIndex();
  const rels = _index.get(source.toLowerCase()) ?? [];
  return rels.find((r) => r.target === target.toLowerCase());
}

/** Get all techs that are related to this tech (any direction). */
export function getRelatedTechs(tech: string): string[] {
  ensureIndex();
  const rels = _index.get(tech.toLowerCase()) ?? [];
  return [...new Set(rels.map((r) => r.target))];
}
