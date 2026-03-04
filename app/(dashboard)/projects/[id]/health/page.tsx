import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CodeHealthReport } from "@/components/features/code-health-report";
import { createClient } from "@/lib/supabase/server";

interface HealthPageProps {
  params: Promise<{ id: string }>;
}

export default async function HealthPage({ params }: HealthPageProps) {
  const t = await getTranslations("Projects");
  const { id } = await params;

  if (!id) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("detail.back")}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-text-muted" />
          <h1 className="text-2xl font-bold text-text-primary">
            {t("health.title")}
          </h1>
        </div>
      </div>

      <p className="text-sm text-text-muted">
        {project.name} — {t("health.description")}
      </p>

      <CodeHealthReport projectId={id} />
    </div>
  );
}
