import { redirect } from "next/navigation";
import { ArrowLeft, Network } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { KnowledgeGraph } from "@/components/features/knowledge-graph";
import { createClient } from "@/lib/supabase/server";
import { getConceptGraph } from "@/server/actions/knowledge-graph";

interface KnowledgeMapPageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function KnowledgeMapPage({
  searchParams,
}: KnowledgeMapPageProps) {
  const t = await getTranslations("Learning");
  const { project: projectId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // If no project specified, get the first analyzed project
  let targetProjectId = projectId;

  if (!targetProjectId) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "analyzed")
      .order("updated_at", { ascending: false })
      .limit(1);

    targetProjectId = projects?.[0]?.id;
  }

  if (!targetProjectId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/learning">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("pathDetail.back")}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("knowledgeMap.title")}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default py-16">
          <Network className="h-8 w-8 text-text-faint" />
          <p className="mt-4 text-sm text-text-muted">
            {t("knowledgeMap.noProject")}
          </p>
          <Link href="/projects" className="mt-4">
            <Button variant="secondary" size="sm">
              {t("knowledgeMap.goToProjects")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const result = await getConceptGraph(targetProjectId);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/learning">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("pathDetail.back")}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("knowledgeMap.title")}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default py-16">
          <Network className="h-8 w-8 text-text-faint" />
          <p className="mt-4 text-sm text-text-muted">
            {t("knowledgeMap.error")}
          </p>
        </div>
      </div>
    );
  }

  const hasNodes = result.data.nodes.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/learning">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("pathDetail.back")}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("knowledgeMap.title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {t("knowledgeMap.description")}
          </p>
        </div>
      </div>

      {hasNodes ? (
        <KnowledgeGraph initialData={result.data} projectId={targetProjectId} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default py-16">
          <Network className="h-8 w-8 text-text-faint" />
          <p className="mt-4 text-sm text-text-muted">
            {t("knowledgeMap.empty")}
          </p>
          <p className="mt-1 text-xs text-text-faint">
            {t("knowledgeMap.emptyHint")}
          </p>
        </div>
      )}
    </div>
  );
}
