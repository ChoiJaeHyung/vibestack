import { notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getArchitectureData } from "@/server/actions/architecture";

const ArchitectureMap = dynamic(
  () => import("@/components/features/architecture-map").then((m) => m.ArchitectureMap),
  { loading: () => <div className="flex h-96 items-center justify-center text-text-faint">Loading...</div> },
);

interface ArchitecturePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArchitecturePage({
  params,
}: ArchitecturePageProps) {
  const t = await getTranslations("Projects");
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const result = await getArchitectureData(id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("detail.back")}
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">
          {t("architecture.title")}
        </h1>
      </div>

      {/* Description */}
      <p className="text-sm text-text-muted">
        {t("architecture.description")}
      </p>

      {/* Map or error */}
      {result.success && result.data ? (
        <ArchitectureMap projectId={id} initialData={result.data} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-default bg-bg-surface p-12 text-center">
          <AlertTriangle className="h-8 w-8 text-text-faint" />
          <p className="text-sm text-text-muted">
            {result.error === "No tech stacks found for this project"
              ? t("architecture.noData")
              : t("architecture.error")}
          </p>
          <Link href={`/projects/${id}`}>
            <Button variant="secondary" size="sm">
              {t("detail.back")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
