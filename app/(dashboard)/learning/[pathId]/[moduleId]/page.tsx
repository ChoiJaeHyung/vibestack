import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  getLearningModule,
  getLearningPathDetail,
} from "@/server/actions/learning";
import { ModuleContent } from "@/components/features/module-content";
import { createClient } from "@/lib/supabase/server";
import { checkRegenerationLimit } from "@/lib/utils/usage-limits";

interface PageProps {
  params: Promise<{ pathId: string; moduleId: string }>;
}

export const maxDuration = 300;

export default async function ModuleDetailPage({ params }: PageProps) {
  const { pathId, moduleId } = await params;

  // Fetch module detail and path detail in parallel
  const [moduleResult, pathResult] = await Promise.all([
    getLearningModule(moduleId),
    getLearningPathDetail(pathId),
  ]);

  if (!moduleResult.success || !moduleResult.data) {
    notFound();
  }

  if (!pathResult.success || !pathResult.data) {
    notFound();
  }

  const mod = moduleResult.data;
  const path = pathResult.data;

  // Get the project_id, project name, and regeneration limit from the learning path
  let projectId = "";
  let projectName = "";
  let maxRegenerationCount = 1;
  try {
    const supabase = await createClient();
    const { data: pathData } = await supabase
      .from("learning_paths")
      .select("project_id, user_id")
      .eq("id", pathId)
      .single();

    if (pathData) {
      projectId = pathData.project_id;
      const [projectResult, regenResult] = await Promise.all([
        supabase
          .from("projects")
          .select("name")
          .eq("id", pathData.project_id)
          .single(),
        checkRegenerationLimit(pathData.user_id, 0),
      ]);
      projectName = projectResult.data?.name ?? "";
      maxRegenerationCount = regenResult.maxCount;
    }
  } catch {
    // Ignore
  }

  // Extract regeneration count from module content
  const contentJson = mod.content as unknown as Record<string, unknown>;
  const regenerationCount = (typeof contentJson._regeneration_count === "number" ? contentJson._regeneration_count : 0);

  const t = await getTranslations("Learning");

  // Find the previous and next modules
  const currentIndex = path.modules.findIndex((m) => m.id === moduleId);
  const currentModule = currentIndex >= 0 ? path.modules[currentIndex] : null;
  const prevModule =
    currentIndex > 0
      ? path.modules[currentIndex - 1]
      : null;
  const nextModule =
    currentIndex >= 0 && currentIndex < path.modules.length - 1
      ? path.modules[currentIndex + 1]
      : null;

  // Check if prerequisites are unmet
  const hasUnmetPrereqs =
    currentModule &&
    !currentModule.isUnlocked &&
    currentModule.prerequisiteNames.length > 0;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href={`/learning/${pathId}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-violet-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {path.title}
      </Link>

      {/* Prerequisite warning banner (dismissible via soft-lock) */}
      {hasUnmetPrereqs && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-300">
            {t("pathDetail.prerequisiteBanner", {
              names: currentModule.prerequisiteNames.join(", "),
            })}
          </p>
        </div>
      )}

      {/* Module content (client component) */}
      <ModuleContent
        moduleId={mod.id}
        title={mod.title}
        description={mod.description}
        moduleType={mod.module_type}
        estimatedMinutes={mod.estimated_minutes}
        sections={mod.content.sections}
        progress={mod.progress}
        learningPathId={pathId}
        projectId={projectId}
        projectName={projectName}
        prevModuleId={prevModule?.id ?? null}
        nextModuleId={nextModule?.id ?? null}
        needsGeneration={!mod.content.sections || mod.content.sections.length === 0}
        regenerationCount={regenerationCount}
        maxRegenerationCount={maxRegenerationCount}
      />
    </div>
  );
}
