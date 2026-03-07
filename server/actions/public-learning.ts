"use server";

import { createServiceClient } from "@/lib/supabase/service";

interface PublicLearningPath {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  locale: string;
  created_at: string;
  module_count: number;
  project_name: string | null;
}

interface PublicModule {
  id: string;
  title: string;
  description: string | null;
  module_type: string | null;
  module_order: number;
  tech_stack_id: string | null;
  estimated_minutes: number | null;
}

interface PublicModuleDetail extends PublicModule {
  content: Record<string, unknown> | null;
}

export async function getPublicLearningPaths(): Promise<PublicLearningPath[]> {
  const supabase = createServiceClient();

  const { data: paths } = await supabase
    .from("learning_paths")
    .select(`
      id, title, description, difficulty, estimated_hours, locale, created_at,
      projects!inner(name)
    `)
    .eq("is_public", true)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!paths) return [];

  // Get module counts
  const pathIds = paths.map((p) => p.id);
  const { data: modules } = await supabase
    .from("learning_modules")
    .select("learning_path_id")
    .in("learning_path_id", pathIds);

  const countMap: Record<string, number> = {};
  for (const m of modules ?? []) {
    countMap[m.learning_path_id] = (countMap[m.learning_path_id] ?? 0) + 1;
  }

  return paths.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    difficulty: p.difficulty,
    estimated_hours: p.estimated_hours,
    locale: p.locale ?? "ko",
    created_at: p.created_at,
    module_count: countMap[p.id] ?? 0,
    project_name: (p.projects as unknown as { name: string })?.name ?? null,
  }));
}

export async function getPublicLearningPathDetail(pathId: string): Promise<{
  path: PublicLearningPath;
  modules: PublicModule[];
} | null> {
  const supabase = createServiceClient();

  const { data: path } = await supabase
    .from("learning_paths")
    .select(`
      id, title, description, difficulty, estimated_hours, locale, created_at,
      projects!inner(name)
    `)
    .eq("id", pathId)
    .eq("is_public", true)
    .eq("status", "active")
    .single();

  if (!path) return null;

  const { data: modules } = await supabase
    .from("learning_modules")
    .select("id, title, description, module_type, module_order, tech_stack_id, estimated_minutes")
    .eq("learning_path_id", pathId)
    .order("module_order", { ascending: true });

  return {
    path: {
      id: path.id,
      title: path.title,
      description: path.description,
      difficulty: path.difficulty,
      estimated_hours: path.estimated_hours,
      locale: path.locale ?? "ko",
      created_at: path.created_at,
      module_count: modules?.length ?? 0,
      project_name: (path.projects as unknown as { name: string })?.name ?? null,
    },
    modules: modules ?? [],
  };
}

/** 첫 2개 모듈은 전체 콘텐츠, 나머지는 메타데이터만 */
export async function getPublicModuleContent(
  pathId: string,
  moduleId: string
): Promise<PublicModuleDetail | null> {
  const supabase = createServiceClient();

  // Verify path is public
  const { data: path } = await supabase
    .from("learning_paths")
    .select("id")
    .eq("id", pathId)
    .eq("is_public", true)
    .single();

  if (!path) return null;

  const { data: module } = await supabase
    .from("learning_modules")
    .select("id, title, description, module_type, module_order, tech_stack_id, estimated_minutes, content")
    .eq("id", moduleId)
    .eq("learning_path_id", pathId)
    .single();

  if (!module) return null;

  // 첫 2개 모듈만 전체 콘텐츠 공개
  const isPreviewable = module.module_order <= 2;

  return {
    id: module.id,
    title: module.title,
    description: module.description,
    module_type: module.module_type,
    module_order: module.module_order,
    tech_stack_id: module.tech_stack_id,
    estimated_minutes: module.estimated_minutes,
    content: isPreviewable ? (module.content as Record<string, unknown>) : null,
  };
}
