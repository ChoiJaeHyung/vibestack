import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, ArrowRight } from "lucide-react";
import { getPublicModuleContent, getPublicLearningPathDetail } from "@/server/actions/public-learning";
import { PublicModuleContent } from "@/components/features/public-module-content";
import { getLocale } from "next-intl/server";

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
  };
}

export default async function PublicModulePage({ params }: Props) {
  const { pathId, moduleId } = await params;
  const mod = await getPublicModuleContent(pathId, moduleId);
  if (!mod) notFound();

  const locale = await getLocale();
  const isKo = locale === "ko";

  // Get path detail for navigation
  const pathData = await getPublicLearningPathDetail(pathId);
  const modules = pathData?.modules ?? [];
  const currentIdx = modules.findIndex((m) => m.id === moduleId);
  const nextModule = currentIdx >= 0 && currentIdx < 1 ? modules[currentIdx + 1] : null;

  // No content = locked module
  if (!mod.content) {
    return (
      <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
        <Link
          href={`/learn/${pathId}`}
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {isKo ? "커리큘럼으로" : "Back to curriculum"}
        </Link>
        <div className="text-center py-20">
          <Lock className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">{mod.title}</h2>
          <p className="text-text-muted mb-6">
            {isKo
              ? "이 모듈은 회원 전용 콘텐츠입니다. 무료로 가입하고 전체 커리큘럼을 학습하세요."
              : "This module is members-only content. Sign up for free to access the full curriculum."}
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

  const sections = (mod.content as { sections?: unknown[] })?.sections ?? [];

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      {/* Back */}
      <Link
        href={`/learn/${pathId}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {isKo ? "커리큘럼으로" : "Back to curriculum"}
      </Link>

      {/* Module Header */}
      <div className="mb-8">
        <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">
          {isKo ? `모듈 ${mod.module_order}` : `Module ${mod.module_order}`}
        </span>
        <h1 className="text-2xl font-bold text-text-primary mt-1">{mod.title}</h1>
        <p className="text-text-muted mt-2">{mod.description}</p>
      </div>

      {/* Content */}
      <PublicModuleContent sections={sections} isKo={isKo} />

      {/* Navigation */}
      <div className="mt-12 flex flex-col items-center gap-4">
        {nextModule && nextModule.module_order <= 2 ? (
          <Link
            href={`/learn/${pathId}/${nextModule.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {isKo ? "다음 모듈" : "Next Module"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="text-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 w-full">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {isKo ? "여기까지 미리보기였어요!" : "That's the end of the preview!"}
            </h3>
            <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
              {isKo
                ? "나머지 모듈과 AI 튜터, 퀴즈, 코드 챌린지를 무료로 시작하세요."
                : "Start the remaining modules with AI tutor, quizzes, and code challenges for free."}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {isKo ? "무료로 시작하기" : "Get Started Free"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
