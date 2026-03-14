/**
 * Groups topologically-sorted concepts into modules.
 *
 * Strategy:
 * - Groups concepts based on difficulty config (2-3 per beginner, 3-5 per others)
 * - Assigns module types based on configured distribution
 * - Ensures minimum module count (MIN_CURRICULUM_MODULES)
 */

import {
  GROUPING_CONFIGS,
  ESTIMATED_MINUTES,
  MIN_CURRICULUM_MODULES,
} from "./constants";

// ─── Types ──────────────────────────────────────────────────────────

export interface ConceptWithTech {
  concept_key: string;
  concept_name: string;
  tech_name: string;
  key_points: string[];
  common_quiz_topics: string[];
  /** "new" | "learning" — mastered concepts are filtered out before grouping */
  mastery_status: "new" | "learning";
}

export interface ModuleGroup {
  title: string;
  description: string;
  module_type: "concept" | "practical" | "quiz" | "project_walkthrough";
  tech_name: string;
  estimated_minutes: number;
  concept_keys: string[];
  /** Used to generate section content */
  concepts: ConceptWithTech[];
}

// ─── Module Type Sequence Generator ─────────────────────────────────

type ModuleType = "concept" | "practical" | "quiz" | "project_walkthrough";

/**
 * Generate a sequence of module types based on distribution config.
 * Uses a deterministic round-robin weighted approach.
 */
function generateModuleTypeSequence(
  count: number,
  distribution: Record<string, number>,
): ModuleType[] {
  const types: ModuleType[] = [];
  const entries = Object.entries(distribution) as Array<[ModuleType, number]>;

  // Calculate how many of each type
  const counts = entries.map(([type, weight]) => ({
    type,
    target: Math.max(1, Math.round(count * weight)),
    assigned: 0,
  }));

  // Fill in sequence: concept first, then interleave others
  // Start with concept modules, then practical, walkthrough, quiz
  const priority: ModuleType[] = ["concept", "practical", "project_walkthrough", "quiz"];

  for (let i = 0; i < count; i++) {
    // Find next type that hasn't reached its target
    let assigned = false;
    for (const pType of priority) {
      const entry = counts.find((c) => c.type === pType);
      if (entry && entry.assigned < entry.target) {
        types.push(pType);
        entry.assigned++;
        assigned = true;
        break;
      }
    }
    // Fallback: assign concept type
    if (!assigned) {
      types.push("concept");
    }
  }

  // Interleave: don't cluster same types together
  // Simple approach: distribute quiz and walkthrough modules throughout
  const conceptIdxs: number[] = [];
  const practicalIdxs: number[] = [];
  const quizIdxs: number[] = [];
  const walkthroughIdxs: number[] = [];

  for (let i = 0; i < types.length; i++) {
    switch (types[i]) {
      case "concept": conceptIdxs.push(i); break;
      case "practical": practicalIdxs.push(i); break;
      case "quiz": quizIdxs.push(i); break;
      case "project_walkthrough": walkthroughIdxs.push(i); break;
    }
  }

  // Reorder: spread non-concept types across the sequence
  const result: ModuleType[] = new Array(count);
  const nonConcept = [...practicalIdxs, ...quizIdxs, ...walkthroughIdxs];
  const spacing = count > 0 ? Math.max(1, Math.floor(count / (nonConcept.length + 1))) : 1;

  // Place non-concept modules at evenly-spaced positions
  const placed = new Set<number>();
  let ncIdx = 0;
  for (const origIdx of nonConcept) {
    const targetPos = Math.min(count - 1, (ncIdx + 1) * spacing);
    // Find nearest available position
    let pos = targetPos;
    while (placed.has(pos) && pos < count) pos++;
    if (pos >= count) {
      pos = 0;
      while (placed.has(pos) && pos < count) pos++;
    }
    result[pos] = types[origIdx];
    placed.add(pos);
    ncIdx++;
  }

  // Fill remaining with concept
  for (let i = 0; i < count; i++) {
    if (!placed.has(i)) {
      result[i] = "concept";
    }
  }

  return result;
}

// ─── Title Generator ────────────────────────────────────────────────

function generateModuleTitle(
  concepts: ConceptWithTech[],
  moduleType: ModuleType,
  locale: string,
): string {
  const mainConcept = concepts[0];
  const techName = mainConcept.tech_name;
  const conceptName = mainConcept.concept_name;

  if (locale === "en") {
    switch (moduleType) {
      case "concept":
        return `Understanding ${conceptName}`;
      case "practical":
        return `${techName} Practice: ${conceptName}`;
      case "quiz":
        return `${techName} Quiz: ${conceptName}`;
      case "project_walkthrough":
        return `${techName} Walkthrough: ${conceptName}`;
    }
  }

  switch (moduleType) {
    case "concept":
      return `${conceptName} 이해하기`;
    case "practical":
      return `${techName} 실습: ${conceptName}`;
    case "quiz":
      return `${techName} 퀴즈: ${conceptName}`;
    case "project_walkthrough":
      return `${techName} 둘러보기: ${conceptName}`;
  }
}

function generateModuleDescription(
  concepts: ConceptWithTech[],
  moduleType: ModuleType,
  locale: string,
): string {
  const conceptNames = concepts.map((c) => c.concept_name);
  const keyPoints = concepts.flatMap((c) => c.key_points).slice(0, 4);

  if (locale === "en") {
    const base = `Learn about ${conceptNames.join(", ")}.`;
    const detail = keyPoints.length > 0
      ? ` Covers: ${keyPoints.join(", ")}.`
      : "";
    return `${base}${detail}`;
  }

  const base = `${conceptNames.join(", ")}에 대해 학습합니다.`;
  const detail = keyPoints.length > 0
    ? ` 다루는 내용: ${keyPoints.join(", ")}`
    : "";
  return `${base}${detail}`;
}

// ─── Main Grouper ───────────────────────────────────────────────────

/**
 * Group sorted concepts into modules.
 *
 * @param sortedConcepts - Topologically sorted concepts with tech info and mastery
 * @param difficulty - Curriculum difficulty level
 * @param locale - Content locale
 * @returns Array of module groups ready for template selection
 */
export function groupConceptsIntoModules(
  sortedConcepts: ConceptWithTech[],
  difficulty: string,
  locale: string,
): ModuleGroup[] {
  const config = GROUPING_CONFIGS[difficulty] ?? GROUPING_CONFIGS.intermediate;
  const { conceptsPerModule, typeDistribution } = config;

  if (sortedConcepts.length === 0) return [];

  // Step 1: Create initial groups by chunking concepts
  const groups: ConceptWithTech[][] = [];
  let currentGroup: ConceptWithTech[] = [];
  let currentTech = sortedConcepts[0].tech_name;

  for (const concept of sortedConcepts) {
    // Start new group if:
    // 1. Current group is at max capacity
    // 2. Technology changed and current group has >= min concepts
    const shouldSplit =
      currentGroup.length >= conceptsPerModule.max ||
      (concept.tech_name !== currentTech && currentGroup.length >= conceptsPerModule.min);

    if (shouldSplit && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
      currentTech = concept.tech_name;
    }

    currentGroup.push(concept);
    currentTech = concept.tech_name;
  }

  // Push remaining
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Step 2: If too few modules, split larger groups
  while (groups.length < MIN_CURRICULUM_MODULES && groups.some((g) => g.length > 1)) {
    // Find largest group
    let maxIdx = 0;
    for (let i = 1; i < groups.length; i++) {
      if (groups[i].length > groups[maxIdx].length) maxIdx = i;
    }

    if (groups[maxIdx].length <= 1) break;

    const toSplit = groups[maxIdx];
    const mid = Math.ceil(toSplit.length / 2);
    groups.splice(maxIdx, 1, toSplit.slice(0, mid), toSplit.slice(mid));
  }

  // Step 3: If still too few, create review/quiz modules for learning-status concepts
  const learningConcepts = sortedConcepts.filter((c) => c.mastery_status === "learning");
  while (groups.length < MIN_CURRICULUM_MODULES && learningConcepts.length > 0) {
    const reviewBatch = learningConcepts.splice(0, conceptsPerModule.min);
    if (reviewBatch.length > 0) {
      groups.push(reviewBatch);
    }
  }

  // Step 4: Assign module types
  const moduleTypes = generateModuleTypeSequence(groups.length, typeDistribution);

  // Step 5: Build ModuleGroup array
  const modules: ModuleGroup[] = groups.map((concepts, i) => {
    const moduleType = moduleTypes[i];
    // Primary tech is the most common tech in this group
    const techCounts = new Map<string, number>();
    for (const c of concepts) {
      techCounts.set(c.tech_name, (techCounts.get(c.tech_name) ?? 0) + 1);
    }
    let primaryTech = concepts[0].tech_name;
    let maxCount = 0;
    for (const [tech, count] of techCounts) {
      if (count > maxCount) {
        primaryTech = tech;
        maxCount = count;
      }
    }

    return {
      title: generateModuleTitle(concepts, moduleType, locale),
      description: generateModuleDescription(concepts, moduleType, locale),
      module_type: moduleType,
      tech_name: primaryTech,
      estimated_minutes: ESTIMATED_MINUTES[moduleType] ?? 25,
      concept_keys: concepts.map((c) => c.concept_key),
      concepts,
    };
  });

  return modules;
}
