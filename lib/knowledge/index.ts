import type { ConceptHint, TechKnowledge } from "./types";

// Static imports — all in-memory, zero latency
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

// Index by normalized tech name for fast lookup
const KB_INDEX = new Map<string, TechKnowledge>();
for (const tk of ALL_KNOWLEDGE) {
  KB_INDEX.set(tk.technology_name.toLowerCase(), tk);
}

/**
 * Get KB hints for a technology.
 * Returns concept hints that can guide the LLM prompt.
 * Zero latency — all data is in-memory.
 */
export function getKBHints(techName: string): ConceptHint[] {
  const tk = KB_INDEX.get(techName.toLowerCase());
  return tk?.concepts ?? [];
}

/**
 * Get all KB technologies for structure prompt.
 * Lets the LLM know which technologies have KB coverage.
 */
export function getKBTechNames(): string[] {
  return ALL_KNOWLEDGE.map((tk) => tk.technology_name);
}
