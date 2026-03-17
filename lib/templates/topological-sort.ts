/**
 * Kahn's algorithm for DAG topological sort of concepts.
 *
 * Input: concept_keys with prerequisite_concepts from KB.
 * Output: ordered concept_keys (prerequisites first).
 *
 * Unlike prerequisite-compute.ts (Module->Module), this sorts
 * Concept->Concept relationships directly.
 */

interface ConceptNode {
  concept_key: string;
  prerequisite_concepts: string[];
}

/**
 * Topologically sort concepts using Kahn's algorithm.
 * Only concepts in `includedKeys` are considered.
 * Concepts with missing prerequisites (not in includedKeys) are treated as having no prereqs.
 *
 * @param concepts - All concepts with their prerequisite relationships
 * @param includedKeys - Set of concept_keys to include (filtered by mastery)
 * @returns Ordered concept_keys (prerequisites first)
 */
export function topologicalSortConcepts(
  concepts: ConceptNode[],
  includedKeys: Set<string>,
): string[] {
  // Build adjacency list and in-degree map for included concepts only
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const key of includedKeys) {
    inDegree.set(key, 0);
    adjacency.set(key, []);
  }

  // Build a quick lookup from concept_key to its ConceptNode
  const conceptMap = new Map<string, ConceptNode>();
  for (const c of concepts) {
    conceptMap.set(c.concept_key, c);
  }

  // Add edges: prerequisite -> concept (only for included keys)
  for (const key of includedKeys) {
    const node = conceptMap.get(key);
    if (!node) continue;

    for (const prereq of node.prerequisite_concepts) {
      if (includedKeys.has(prereq)) {
        // prereq -> key (prereq must come before key)
        adjacency.get(prereq)!.push(key);
        inDegree.set(key, (inDegree.get(key) ?? 0) + 1);
      }
    }
  }

  // Kahn's algorithm: start with nodes that have 0 in-degree
  const queue: string[] = [];
  for (const [key, degree] of inDegree) {
    if (degree === 0) {
      queue.push(key);
    }
  }

  // Sort initial queue for deterministic output
  queue.sort();

  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        // Insert in sorted position for deterministic output
        const insertIdx = queue.findIndex((q) => q > neighbor);
        if (insertIdx === -1) {
          queue.push(neighbor);
        } else {
          queue.splice(insertIdx, 0, neighbor);
        }
      }
    }
  }

  // Cycle detection: if not all included concepts were processed, a cycle exists
  if (result.length < includedKeys.size) {
    const remaining = [...includedKeys].filter((k) => !result.includes(k));
    console.warn(
      `[topological-sort] Cycle detected among concepts: ${remaining.join(", ")}. ` +
        `Appending in original order to break cycle.`,
    );

    // Preserve original concept order for deterministic cycle-breaking
    const originalOrder = concepts
      .map((c) => c.concept_key)
      .filter((k) => remaining.includes(k));
    result.push(...originalOrder);
  }

  return result;
}
