import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Code, Settings2, FileJson, File, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectAnalysis } from "@/components/features/project-analysis";
import { createClient } from "@/lib/supabase/server";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

const fileTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dependency: FileJson,
  ai_config: Settings2,
  build_config: Settings2,
  source_code: Code,
  other: File,
};

const statusLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  uploaded: { label: "Uploaded", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  analyzing: { label: "Analyzing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  analyzed: { label: "Analyzed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  error: { label: "Error", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  let project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    source_platform: string | null;
    source_channel: string | null;
    last_synced_at: string | null;
    created_at: string;
    updated_at: string;
  } | null = null;

  let files: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_path: string | null;
    file_size: number | null;
    created_at: string;
  }> = [];

  let techStacks: Array<{
    id: string;
    technology_name: string;
    category: string;
    subcategory: string | null;
    version: string | null;
    confidence_score: number;
    importance: string;
    description: string | null;
  }> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      notFound();
    }

    const { data: projectData } = await supabase
      .from("projects")
      .select("id, name, description, status, source_platform, source_channel, last_synced_at, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!projectData) {
      notFound();
    }

    project = projectData;

    const { data: fileData } = await supabase
      .from("project_files")
      .select("id, file_name, file_type, file_path, file_size, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    files = fileData ?? [];

    const { data: techData } = await supabase
      .from("tech_stacks")
      .select("id, technology_name, category, subcategory, version, confidence_score, importance, description")
      .eq("project_id", id)
      .order("confidence_score", { ascending: false });

    techStacks = techData ?? [];
  } catch {
    notFound();
  }

  if (!project) {
    notFound();
  }

  const statusInfo = statusLabels[project.status] ?? statusLabels.created;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {project.name}
            </h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">소스</dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {project.source_platform ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">채널</dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {project.source_channel ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">생성일</dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {new Date(project.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">마지막 동기화</dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {project.last_synced_at
                  ? new Date(project.last_synced_at).toLocaleDateString()
                  : "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Tech Stack Analysis */}
      <ProjectAnalysis
        projectId={project.id}
        initialStatus={project.status}
        initialTechStacks={techStacks}
      />

      {/* Files */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>파일 ({files.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              업로드된 파일이 없습니다
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {files.map((file) => {
                const Icon = fileTypeIcons[file.file_type] ?? FileText;
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {file.file_name}
                      </p>
                      {file.file_path && (
                        <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                          {file.file_path}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                        {file.file_type}
                      </span>
                      {file.file_size && (
                        <span>{formatFileSize(file.file_size)}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
