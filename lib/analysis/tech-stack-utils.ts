import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type TechCategory = Database["public"]["Enums"]["tech_category"];
type Importance = Database["public"]["Enums"]["importance"];
type TechStackInsert = Database["public"]["Tables"]["tech_stacks"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

const VALID_CATEGORIES = new Set<TechCategory>([
  "framework",
  "language",
  "database",
  "auth",
  "deploy",
  "styling",
  "testing",
  "build_tool",
  "library",
  "other",
]);

const VALID_IMPORTANCE = new Set<Importance>([
  "core",
  "supporting",
  "dev_dependency",
]);

export interface TechStackInput {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  importance: string;
  description?: string;
}

/**
 * Upsert tech stacks into DB for a project.
 * Extracted from analyze/route.ts Steps 7-9.
 */
export async function upsertTechStacks(
  supabase: SupabaseClient<Database>,
  projectId: string,
  technologies: TechStackInput[],
  architectureSummary?: string,
): Promise<{ savedCount: number }> {
  let savedCount = 0;

  for (const tech of technologies) {
    const category = VALID_CATEGORIES.has(tech.category as TechCategory)
      ? (tech.category as TechCategory)
      : "other";

    const importance = VALID_IMPORTANCE.has(tech.importance as Importance)
      ? (tech.importance as Importance)
      : "supporting";

    const techStackData: TechStackInsert = {
      project_id: projectId,
      technology_name: tech.name,
      category,
      version: tech.version ?? null,
      confidence_score: tech.confidence,
      detected_from: ["local_analysis"],
      description: tech.description ?? null,
      importance,
      relationships: null,
    };

    const { data: existingTech } = await supabase
      .from("tech_stacks")
      .select("id")
      .eq("project_id", projectId)
      .eq("technology_name", tech.name)
      .single();

    if (existingTech) {
      await supabase
        .from("tech_stacks")
        .update({
          category,
          version: tech.version ?? null,
          confidence_score: tech.confidence,
          detected_from: ["local_analysis"],
          description: tech.description ?? null,
          importance,
        })
        .eq("id", existingTech.id);
    } else {
      await supabase.from("tech_stacks").insert(techStackData);
    }

    savedCount++;
  }

  // Build tech_summary
  const techSummary = {
    architecture_summary: architectureSummary ?? null,
    total_technologies: technologies.length,
    core_technologies: technologies
      .filter((t) => t.importance === "core")
      .map((t) => t.name),
    categories: groupTechnologiesByCategory(technologies),
    analyzed_at: new Date().toISOString(),
    llm_provider: "local",
    llm_model: "local",
  };

  // Update project status to 'analyzed'
  const analyzedUpdate: ProjectUpdate = {
    status: "analyzed",
    tech_summary: techSummary,
    updated_at: new Date().toISOString(),
  };
  await supabase
    .from("projects")
    .update(analyzedUpdate)
    .eq("id", projectId);

  return { savedCount };
}

function groupTechnologiesByCategory(
  technologies: TechStackInput[],
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const tech of technologies) {
    if (!groups[tech.category]) {
      groups[tech.category] = [];
    }
    groups[tech.category].push(tech.name);
  }
  return groups;
}
