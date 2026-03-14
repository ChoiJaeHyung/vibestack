import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import { getPublicModuleContent, getPublicLearningPathDetail } from "@/server/actions/public-learning";
import { PublicModuleContent } from "@/components/features/public-module-content";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface Props {
  params: Promise<{ pathId: string; moduleId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pathId, moduleId } = await params;
  const mod = await getPublicModuleContent(pathId, moduleId);
  if (!mod) return { title: "Not Found" };
  return {
    title: mod.title,
    description: mod.description ?? undefined,
    alternates: {
      canonical: `https://vibeuniv.com/learn/${pathId}/${moduleId}`,
    },
    openGraph: {
      title: mod.title,
      description: mod.description ?? undefined,
      type: "article",
      url: `https://vibeuniv.com/learn/${pathId}/${moduleId}`,
    },
  };
}

export default async function PublicModulePage({ params }: Props) {
  const { pathId, moduleId } = await params;
  const mod = await getPublicModuleContent(pathId, moduleId);
  if (!mod) notFound();

  const tc = await getTranslations("Common");
  const t = await getTranslations("Public");

  // Get path detail for navigation
  const pathData = await getPublicLearningPathDetail(pathId);
  const modules = pathData?.modules ?? [];
  const currentIdx = modules.findIndex((m) => m.id === moduleId);
  const nextModule = currentIdx >= 0 && currentIdx < 1 ? modules[currentIdx + 1] : null;

  const pathTitle = pathData?.path.title ?? "";

  const breadcrumbItems = [
    { label: tc("breadcrumb.home"), href: "/" },
    { label: tc("nav.learn"), href: "/learn" },
    { label: pathTitle, href: `/learn/${pathId}` },
    { label: mod.title },
  ];

  // No content = locked module
  if (!mod.content) {
    return (
      <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-20">
          <Lock className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">{mod.title}</h2>
          <p className="text-text-muted mb-6">
            {t("learnDetail.membersOnly")}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t("learnDetail.ctaButton")}
          </Link>
        </div>
      </div>
    );
  }

  const sections = (mod.content as { sections?: unknown[] })?.sections ?? [];

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      <Breadcrumb items={breadcrumbItems} />

      {/* Module Header */}
      <div className="mb-8">
        <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">
          {t("learnDetail.moduleLabel", { order: mod.module_order })}
        </span>
        <h1 className="text-2xl font-bold text-text-primary mt-1">{mod.title}</h1>
        <p className="text-text-muted mt-2">{mod.description}</p>
      </div>

      {/* Content */}
      <PublicModuleContent sections={sections} />

      {/* Navigation */}
      <div className="mt-12 flex flex-col items-center gap-4">
        {nextModule && nextModule.module_order <= 2 ? (
          <Link
            href={`/learn/${pathId}/${nextModule.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t("learnDetail.nextModule")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="text-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 w-full">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {t("learnDetail.previewEnd")}
            </h3>
            <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
              {t("learnDetail.previewEndDesc")}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {t("learnDetail.ctaButton")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
