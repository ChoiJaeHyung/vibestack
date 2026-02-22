import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/features/project-card";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  let projects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: "created" | "uploaded" | "analyzing" | "analyzed" | "error";
    tech_summary: unknown;
    updated_at: string;
  }> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, status, tech_summary, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (data) {
        projects = data as typeof projects;
      }
    }
  } catch {
    // Supabase not configured or error
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Projects
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            AI로 분석할 프로젝트를 관리하세요
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 프로젝트가 없습니다
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            MCP 서버를 연결하거나 프로젝트를 업로드하세요
          </p>
          <Link href="/settings" className="mt-4">
            <Button variant="secondary" size="sm">
              설정으로 이동
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const techStack = extractTechNames(project.tech_summary);
            return (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                status={project.status}
                techStack={techStack}
                updatedAt={project.updated_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function extractTechNames(techSummary: unknown): string[] {
  if (!techSummary || typeof techSummary !== "object") return [];
  if (Array.isArray(techSummary)) {
    return techSummary
      .filter((item): item is { name: string } => typeof item?.name === "string")
      .map((item) => item.name);
  }
  return [];
}
