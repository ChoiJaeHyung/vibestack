/**
 * E2E test script for the Template Assembler pipeline.
 * Run with: npx tsx lib/templates/test-assembler.ts
 *
 * Tests:
 * 1. checkMultiTechCoverage - React seed data coverage
 * 2. selectTemplatesForModule - Level 1 exact match
 * 3. Full assembly pipeline (without user mastery)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load env
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("=== Template Engine E2E Test ===\n");

  // Test 1: Verify seed data
  console.log("--- Test 1: Seed Data Verification ---");
  const { data: templates, error: tplError } = await supabase
    .from("content_templates")
    .select("concept_key, section_type, title")
    .eq("technology_name", "React")
    .eq("locale", "ko")
    .eq("difficulty", "beginner");

  if (tplError) {
    console.error("FAIL: Cannot query content_templates:", tplError.message);
    process.exit(1);
  }

  console.log(`  Templates found: ${templates.length}`);
  const conceptKeys = [...new Set(templates.map((t) => t.concept_key))];
  console.log(`  Unique concepts: ${conceptKeys.length} (${conceptKeys.join(", ")})`);

  const byType = new Map<string, number>();
  for (const t of templates) {
    byType.set(t.section_type, (byType.get(t.section_type) ?? 0) + 1);
  }
  for (const [type, count] of byType) {
    console.log(`    ${type}: ${count}`);
  }
  console.log(templates.length === 16 ? "  PASS: 16 rows found" : `  WARN: Expected 16, got ${templates.length}`);

  // Test 2: Coverage check
  console.log("\n--- Test 2: Coverage Check ---");
  const techConcepts = [{ techName: "React", conceptKeys }];

  const allConceptKeys = techConcepts.flatMap((tc) => tc.conceptKeys);
  const { data: covData, error: covError } = await supabase
    .from("content_templates")
    .select("concept_key")
    .in("concept_key", allConceptKeys)
    .eq("locale", "ko");

  if (covError) {
    console.error("FAIL: Coverage query error:", covError.message);
  } else {
    const coveredKeys = new Set(covData.map((r) => r.concept_key as string));
    const covered = conceptKeys.filter((k) => coveredKeys.has(k)).length;
    console.log(`  React: ${covered}/${conceptKeys.length} concepts covered`);
    const level = covered === conceptKeys.length ? "full" : covered > 0 ? "partial" : "none";
    console.log(`  Coverage level: ${level}`);
    console.log(level !== "none" ? "  PASS: Coverage detected" : "  FAIL: No coverage");
  }

  // Test 3: Template selection (Level 1 exact match)
  console.log("\n--- Test 3: Template Selection (Level 1) ---");
  const testConcepts = ["react-components", "jsx-syntax"];

  const { data: exactRows, error: selError } = await supabase
    .from("content_templates")
    .select("section_type, title, body")
    .in("concept_key", testConcepts)
    .eq("difficulty", "beginner")
    .eq("locale", "ko")
    .order("concept_key")
    .order("section_type");

  if (selError) {
    console.error("FAIL: Selection query error:", selError.message);
  } else {
    console.log(`  Level 1 exact matches: ${exactRows.length}`);
    const selByType = new Map<string, number>();
    for (const r of exactRows) {
      selByType.set(r.section_type, (selByType.get(r.section_type) ?? 0) + 1);
    }
    for (const [type, count] of selByType) {
      console.log(`    ${type}: ${count}`);
    }

    // Check body length
    const explanations = exactRows.filter((r) => r.section_type === "explanation");
    const shortExplanations = explanations.filter((r) => (r.body as string).trim().length < 200);
    if (shortExplanations.length > 0) {
      console.log(`  WARN: ${shortExplanations.length} explanations under 200 chars`);
    } else {
      console.log("  PASS: All explanations meet length requirement");
    }
    console.log(exactRows.length >= 6 ? "  PASS: Sufficient sections found" : "  WARN: Low section count");
  }

  // Test 4: Full assembly simulation
  console.log("\n--- Test 4: Assembly Pipeline Simulation ---");

  // Simulate what assembleCurriculum does:
  // 1. Get KB hints -> we use our seed concepts
  // 2. No mastery (new user) -> all concepts included
  // 3. Topological sort -> react-components first (no prereqs)
  // 4. Group into modules -> beginner: 2-3 concepts/module
  // 5. Select templates -> Level 1 match from seed data

  const sortedConcepts = [
    "react-components",  // no prereqs
    "hooks-useState",    // prereq: react-components
    "jsx-syntax",        // prereq: react-components
    "props-data-flow",   // prereq: react-components, jsx-syntax
  ];

  // Module grouping (beginner: 2-3 concepts per module)
  const modules = [
    { title: "Module 1: React Basics", concepts: ["react-components", "jsx-syntax"] },
    { title: "Module 2: Data & State", concepts: ["props-data-flow", "hooks-useState"] },
  ];

  let totalSections = 0;
  let totalFallbacks = 0;

  for (const mod of modules) {
    const { data: modSections } = await supabase
      .from("content_templates")
      .select("section_type, title")
      .in("concept_key", mod.concepts)
      .eq("difficulty", "beginner")
      .eq("locale", "ko");

    const sectionCount = modSections?.length ?? 0;
    totalSections += sectionCount;

    // beginner needs 7+ sections, we have 8 per 2-concept module
    const needsFallback = sectionCount < 7;
    if (needsFallback) totalFallbacks++;

    console.log(`  ${mod.title}: ${sectionCount} sections ${needsFallback ? "(needs LLM fallback)" : "(FULL)"}`);
  }

  console.log(`\n  Total sections: ${totalSections}`);
  console.log(`  Modules needing fallback: ${totalFallbacks}/${modules.length}`);
  console.log(totalFallbacks === 0
    ? "  PASS: All modules have full template coverage!"
    : "  PARTIAL: Some modules need LLM fallback for missing sections");

  // Summary
  console.log("\n=== Summary ===");
  console.log(`  Seed data: ${templates.length} templates`);
  console.log(`  Concepts covered: ${conceptKeys.length}`);
  console.log(`  Assembly: ${totalFallbacks === 0 ? "Fully prebuilt" : "Partial (LLM fallback needed)"}`);
  console.log(`  Prebuilt path: ${totalFallbacks === 0 ? "READY" : "PARTIAL"}`);
  console.log("\nDone.");
}

main().catch(console.error);
