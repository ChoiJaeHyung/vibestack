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

  // Get the project_id from the learning path
  let projectId = "";
  try {
    const supabase = await createClient();
    const { data: pathData } = await supabase
      .from("learning_paths")
      .select("project_id")
      .eq("id", pathId)
      .single();

    if (pathData) {
      projectId = pathData.project_id;
    }
  } catch {
    // Ignore
  }

  // Find the next module
  const currentIndex = path.modules.findIndex((m) => m.id === moduleId);
  const nextModule =
    currentIndex >= 0 && currentIndex < path.modules.length - 1
      ? path.modules[currentIndex + 1]
      : null;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href={`/learning/${pathId}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
        nextModuleId={nextModule?.id ?? null}
        needsGeneration={!mod.content.sections || mod.content.sections.length === 0}
      />
    </div>
  );
}
