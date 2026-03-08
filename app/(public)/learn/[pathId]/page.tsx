import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Lock, BookOpen, Code2, HelpCircle, Compass } from "lucide-react";
import { getPublicLearningPathDetail } from "@/server/actions/public-learning";
import { getLocale } from "next-intl/server";

interface Props {
  params: Promise<{ pathId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pathId } = await params;
  const data = await getPublicLearningPathDetail(pathId);
  if (!data) return { title: "Not Found" };
  return {
    title: data.path.title,
    description: data.path.description ?? undefined,
  };
}

const typeIcons: Record<string, typeof BookOpen> = {
  concept: BookOpen,
  practical: Code2,
  quiz: HelpCircle,
  project_walkthrough: Compass,
};

const typeLabels: Record<string, string> = {
  concept: "Concept",
  practical: "Practical",
  quiz: "Quiz",
  project_walkthrough: "Walkthrough",
};

export default async function PublicLearningPathPage({ params }: Props) {
  const { pathId } = await params;
  const data = await getPublicLearningPathDetail(pathId);
  if (!data) notFound();

  const locale = await getLocale();
  const isKo = locale === "ko";
  const { path, modules } = data;

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      {/* Back */}
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {isKo ? "목록으로" : "Back to list"}
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{path.title}</h1>
        <p className="text-text-muted leading-relaxed mb-4">{path.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="rounded-full border border-border-default px-3 py-1 capitalize">
            {path.difficulty}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {path.estimated_hours}h
          </span>
          <span>{path.module_count} {isKo ? "모듈" : "modules"}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border-default max-md:left-4" />

        <div className="space-y-1">
          {modules.map((mod) => {
            const isPreviewable = mod.module_order <= 2;
            const Icon = typeIcons[mod.module_type ?? "concept"] ?? BookOpen;

            return (
              <div key={mod.id} className="relative pl-12 max-md:pl-10 py-3">
                {/* Dot */}
                <div
                  className={`absolute left-3 top-5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold max-md:left-2 ${
                    isPreviewable
                      ? "border-violet-500 bg-violet-500/20 text-violet-400"
                      : "border-border-default bg-bg-primary text-text-muted"
                  }`}
                >
                  {mod.module_order}
                </div>

                {isPreviewable ? (
                  <Link
                    href={`/learn/${pathId}/${mod.id}`}
                    className="block rounded-xl border border-border-default bg-bg-primary hover:border-violet-500/40 transition-all p-4 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-violet-400" />
                      <span className="text-[10px] font-medium text-violet-400 uppercase tracking-wider">
                        {typeLabels[mod.module_type ?? "concept"] ?? mod.module_type}
                      </span>
                      <span className="text-[10px] text-emerald-400 ml-auto">
                        {isKo ? "무료 미리보기" : "Free Preview"}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-violet-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">{mod.description}</p>
                    {mod.estimated_minutes && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-muted mt-2">
                        <Clock className="h-3 w-3" />
                        {mod.estimated_minutes}{isKo ? "분" : "min"}
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="rounded-xl border border-border-default/50 bg-bg-primary/50 p-4 opacity-70">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-text-muted" />
                      <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                        {typeLabels[mod.module_type ?? "concept"] ?? mod.module_type}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-text-muted ml-auto">
                        <Lock className="h-3 w-3" />
                        {isKo ? "회원 전용" : "Members only"}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-text-secondary">{mod.title}</h3>
                    <p className="text-xs text-text-muted mt-1 line-clamp-1">{mod.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8">
        <Lock className="h-8 w-8 text-violet-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {isKo ? "나머지 모듈도 학습하고 싶으신가요?" : "Want to study the remaining modules?"}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {isKo
            ? "무료 가입하면 AI 튜터, 퀴즈, 코드 챌린지와 함께 전체 커리큘럼을 학습할 수 있어요."
            : "Sign up for free to access the full curriculum with AI tutor, quizzes, and code challenges."}
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {isKo ? "무료로 시작하기" : "Get Started Free"}
        </Link>
      </div>
    </div>
  );
}
