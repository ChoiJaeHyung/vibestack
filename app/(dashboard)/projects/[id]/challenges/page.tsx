import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ChallengeList } from "@/components/features/challenge-list";
import { createClient } from "@/lib/supabase/server";

interface ChallengesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengesPage({ params }: ChallengesPageProps) {
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

  // Get user locale
  const { data: userData } = await supabase
    .from("users")
    .select("locale")
    .eq("id", user.id)
    .single();

  const locale = (userData?.locale as "ko" | "en") ?? "ko";

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
          <Zap className="h-5 w-5 text-text-muted" />
          <h1 className="text-2xl font-bold text-text-primary">
            {t("challenges.title")}
          </h1>
        </div>
      </div>

      <p className="text-sm text-text-muted">
        {project.name} — {t("challenges.description")}
      </p>

      <ChallengeList projectId={id} locale={locale} />
    </div>
  );
}
