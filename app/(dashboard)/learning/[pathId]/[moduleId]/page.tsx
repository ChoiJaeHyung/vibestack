import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getLearningModule,
  getLearningPathDetail,
} from "@/server/actions/learning";
import { ModuleContent } from "@/components/features/module-content";
import { createClient } from "@/lib/supabase/server";

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

  // Get the project_id and project name from the learning path
  let projectId = "";
  let projectName = "";
  try {
    const supabase = await createClient();
    const { data: pathData } = await supabase
      .from("learning_paths")
      .select("project_id")
      .eq("id", pathId)
      .single();

    if (pathData) {
      projectId = pathData.project_id;
      const { data: projectData } = await supabase
        .from("projects")
        .select("name")
        .eq("id", pathData.project_id)
        .single();
      projectName = projectData?.name ?? "";
    }
  } catch {
    // Ignore
  }

  // Find the previous and next modules
  const currentIndex = path.modules.findIndex((m) => m.id === moduleId);
  const prevModule =
    currentIndex > 0
      ? path.modules[currentIndex - 1]
      : null;
  const nextModule =
    currentIndex >= 0 && currentIndex < path.modules.length - 1
      ? path.modules[currentIndex + 1]
      : null;

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
      />
    </div>
  );
}
