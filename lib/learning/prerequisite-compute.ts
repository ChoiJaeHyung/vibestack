/**
 * R4' computation: Derive Module→Module prerequisites from
 * R1 (Concept→Concept prerequisite) + R6 (Module→Concept coverage).
 *
 * Algorithm:
 * 1. Build reverse index: concept_key → moduleId[]
 * 2. For each module M:
 *    a. For each concept in M.conceptKeys, look up prerequisite_concepts (R1)
 *    b. Find other modules N that cover the prerequisite concepts (reverse index)
 *    c. Add N.id to M.prerequisites
 * 3. Transitive reduction: if A→B→C, remove A→C (minimal set)
 */

interface ModuleInput {
  moduleId: string;
  conceptKeys: string[];
  moduleOrder: number;
}

/**
 * Compute module prerequisite relationships from concept DAG and module coverage.
 *
 * @param modules - Array of modules with their concept_keys and order
 * @param conceptPrereqs - Map of concept_key → prerequisite concept_keys (R1)
 * @returns Map of moduleId → prerequisite moduleIds
 */
export function computeModulePrerequisites(
  modules: ModuleInput[],
  conceptPrereqs: Map<string, string[]>,
): Map<string, string[]> {
  // 1. Reverse index: concept_key → moduleId[]
  const conceptToModules = new Map<string, string[]>();
  for (const mod of modules) {
    for (const ck of mod.conceptKeys) {
      if (!conceptToModules.has(ck)) conceptToModules.set(ck, []);
      conceptToModules.get(ck)!.push(mod.moduleId);
    }
  }

  // 2. For each module, find prerequisite modules
  const result = new Map<string, string[]>();
  for (const mod of modules) {
    const prereqIds = new Set<string>();
    for (const conceptKey of mod.conceptKeys) {
      for (const prereqConcept of conceptPrereqs.get(conceptKey) ?? []) {
        for (const coveringId of conceptToModules.get(prereqConcept) ?? []) {
          if (coveringId !== mod.moduleId) {
            prereqIds.add(coveringId);
          }
        }
      }
    }
    if (prereqIds.size > 0) {
      result.set(mod.moduleId, [...prereqIds]);
    }
  }

  // 3. Transitive reduction: remove indirect prerequisites
  // If A depends on B and B depends on C, then A→C is redundant (A→B→C suffices)
  for (const [moduleId, prereqs] of result) {
    const transitive = new Set<string>();
    for (const pId of prereqs) {
      for (const ppId of result.get(pId) ?? []) {
        transitive.add(ppId);
      }
    }
    if (transitive.size > 0) {
      result.set(
        moduleId,
        prereqs.filter((p) => !transitive.has(p)),
      );
    }
  }

  return result;
}
