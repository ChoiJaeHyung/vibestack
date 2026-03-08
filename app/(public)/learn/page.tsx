import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  Code2,
  Brain,
  MessageCircleQuestion,
  Trophy,
  Cpu,
  ArrowRight,
  Sparkles,
  Target,
} from "lucide-react";
import { getPublicLearningPaths } from "@/server/actions/public-learning";
import { getLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Learn — AI 맞춤 학습 커리큘럼",
  description:
    "AI가 분석한 실제 프로젝트 기반 학습 커리큘럼을 무료로 미리보기. 바이브 코딩으로 만든 앱의 기술 스택을 이해해보세요. 내 코드가 교과서가 되는 새로운 학습 방식.",
  openGraph: {
    title: "AI 맞춤 학습 커리큘럼 — 내 코드로 배우는 기술 스택",
    description:
      "AI가 실제 프로젝트를 분석해서 만든 맞춤 학습 콘텐츠를 지금 바로 확인하세요. 초급부터 고급까지 단계별 로드맵 제공.",
  },
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export default async function PublicLearnPage() {
  const paths = await getPublicLearningPaths();
  const locale = await getLocale();
  const isKo = locale === "ko";

  return (
    <div className="max-w-[960px] mx-auto px-8 max-md:px-4 py-12">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Learn" },
        ]}
      />
      {/* ===== Section 1: Hero / Introduction ===== */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 mb-6">
          <GraduationCap className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-medium text-violet-400">
            VibeUniv 학습 시스템
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
          내 코드가 교과서가 되는 새로운 학습
        </h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed mb-4">
          Claude Code, Cursor, Bolt 같은 AI 도구로 앱을 만들었지만, 그 코드가
          어떻게 동작하는지 이해하기 어려웠나요? VibeUniv는 AI가 여러분의 실제
          프로젝트를 분석해서, 사용된 기술 스택에 맞는 맞춤 커리큘럼을 자동으로
          만들어줍니다.
        </p>
        <p className="text-text-muted max-w-2xl mx-auto leading-relaxed mb-4">
          추상적인 온라인 강의 대신, 내가 만든 코드가 교재입니다. Next.js, React,
          Supabase, Tailwind CSS 등 내 프로젝트에서 실제로 사용된 기술을 하나씩
          짚어가며 배울 수 있어요. 초급 입문자부터 실전 경험자까지, AI가 수준에
          맞춰 단계별 로드맵을 설계합니다.
        </p>
        <p className="text-text-muted max-w-2xl mx-auto leading-relaxed">
          아래에서 공개된 학습 커리큘럼을 둘러보거나,{" "}
          <Link
            href="/signup"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
          >
            무료로 가입
          </Link>
          해서 나만의 맞춤 커리큘럼을 만들어보세요.
        </p>
      </div>

      {/* ===== Section 2: How Learning Works (3 Steps) ===== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            이렇게 학습해요
          </h2>
          <p className="text-text-muted">
            프로젝트를 연결하면, 3단계로 맞춤 학습이 시작됩니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              icon: Code2,
              title: "프로젝트 연결 & 분석",
              desc: "MCP 서버 또는 파일 업로드로 프로젝트를 연결하면, AI가 자동으로 기술 스택을 분석합니다. 어떤 프레임워크, 라이브러리, 패턴이 사용되었는지 한눈에 파악할 수 있어요.",
            },
            {
              step: "02",
              icon: Target,
              title: "맞춤 커리큘럼 생성",
              desc: "분석 결과를 바탕으로 AI가 맞춤 학습 로드맵을 만듭니다. 초급(beginner)부터 고급(advanced)까지 난이도를 선택하면, 모듈별로 구조화된 커리큘럼이 자동 생성됩니다.",
            },
            {
              step: "03",
              icon: Brain,
              title: "AI 튜터와 함께 학습",
              desc: "각 모듈에는 개념 설명, 코드 워크스루, 퀴즈가 포함되어 있어요. 학습 중 궁금한 코드를 선택하면 AI 튜터가 내 프로젝트 맥락으로 설명해줍니다.",
            },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-border-default bg-bg-primary p-6 relative"
            >
              <span className="absolute top-4 right-4 text-3xl font-black text-text-muted/10">
                {step}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Section 3: Key Features (4 Cards) ===== */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            VibeUniv 학습의 특별한 점
          </h2>
          <p className="text-text-muted">
            일반적인 온라인 강의와는 다릅니다. 내 코드, 내 프로젝트 중심의
            학습이에요.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: BookOpen,
              title: "내 코드가 교과서",
              desc: "추상적인 예제 대신, 내가 실제로 만든 프로젝트의 코드로 학습합니다. app/layout.tsx 파일이 왜 이렇게 생겼는지, useEffect가 이 컴포넌트에서 왜 필요한지 — 내 코드 맥락에서 이해할 수 있어요.",
              gradient: "from-violet-500 to-purple-600",
            },
            {
              icon: MessageCircleQuestion,
              title: "AI 튜터 — 내 코드 전문가",
              desc: "궁금한 코드를 드래그해서 선택하면 AI가 바로 설명해줍니다. 일반적인 ChatGPT 답변이 아니라, 내 프로젝트의 파일 구조와 기술 스택을 이해한 맥락 있는 답변을 받을 수 있어요.",
              gradient: "from-cyan-500 to-blue-600",
            },
            {
              icon: Trophy,
              title: "퀴즈 & 챌린지로 실력 확인",
              desc: "각 모듈마다 퀴즈와 코드 챌린지가 포함되어 있어서, 배운 내용을 바로 확인할 수 있습니다. 점수는 자동으로 추적되고, 최고점이 기록됩니다. 배지와 스트릭으로 학습 동기를 유지하세요.",
              gradient: "from-amber-500 to-orange-600",
            },
            {
              icon: Cpu,
              title: "11개 AI 모델 지원 (BYOK)",
              desc: "Anthropic Claude, OpenAI GPT, Google Gemini, Groq, Mistral, DeepSeek 등 11개 AI 모델을 지원합니다. Pro 플랜에서는 자신의 API 키를 등록(BYOK)해서 선호하는 모델로 학습할 수 있어요.",
              gradient: "from-emerald-500 to-teal-600",
            },
          ].map(({ icon: Icon, title, desc, gradient }) => (
            <div
              key={title}
              className="rounded-2xl border border-border-default bg-bg-primary p-6"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">
                {title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Section 3.5: Who Is This For ===== */}
      <section className="mb-16">
        <div className="rounded-2xl border border-border-default bg-bg-primary p-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
            이런 분들에게 딱이에요
          </h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              "AI 도구(Claude Code, Cursor, Bolt)로 앱을 만들었는데, 코드를 이해하고 싶은 분",
              "React, Next.js 등 프레임워크를 실전 프로젝트로 배우고 싶은 분",
              "온라인 강의를 들어도 실제 적용이 어려웠던 분",
              "자기 프로젝트의 아키텍처와 패턴을 제대로 이해하고 싶은 분",
              "코딩 부트캠프 없이 독학으로 실력을 키우고 싶은 분",
              "바이브 코딩에서 한 단계 더 성장하고 싶은 모든 개발자",
            ].map((text) => (
              <div key={text} className="flex items-start gap-3 py-2">
                <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                <span className="text-sm text-text-secondary leading-relaxed">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Section 3.7: Related Resources ===== */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          더 알아보기
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              href: "/blog/how-to-learn-ai-generated-code",
              title: "AI가 만든 코드, 어떻게 학습할까?",
              desc: "바이브 코딩으로 만든 프로젝트를 이해하는 효과적인 학습 전략을 소개합니다.",
            },
            {
              href: "/technology",
              title: "VibeUniv 핵심 기술",
              desc: "온톨로지 기반 지식 그래프, 개념 숙련도 추적 등 학습 시스템의 기술적 배경을 살펴보세요.",
            },
            {
              href: "/guide/features",
              title: "기능 가이드",
              desc: "프로젝트 연결부터 학습 완료까지, VibeUniv의 모든 기능을 단계별로 안내합니다.",
            },
          ].map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border-default bg-bg-primary p-5 hover:border-violet-500/40 transition-colors"
            >
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-violet-400 transition-colors mb-1.5 flex items-center gap-1.5">
                {title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Section 4: Public Curricula ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              공개 커리큘럼 둘러보기
            </h2>
            <p className="text-sm text-text-muted">
              다른 바이브 코더들의 프로젝트로 만든 학습 커리큘럼을 무료로 미리
              체험해보세요. 첫 2개 모듈을 바로 읽을 수 있습니다.
            </p>
          </div>
        </div>

        {/* Path List */}
        {paths.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            {isKo
              ? "아직 공개된 커리큘럼이 없습니다."
              : "No public curricula available yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {paths.map((path) => (
              <Link
                key={path.id}
                href={`/learn/${path.id}`}
                className="block rounded-2xl border border-border-default bg-bg-primary hover:border-violet-500/40 transition-all p-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-violet-400 transition-colors truncate">
                        {path.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${
                          difficultyColors[path.difficulty ?? "beginner"] ??
                          difficultyColors.beginner
                        }`}
                      >
                        {path.difficulty ?? "beginner"}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2 mb-3">
                      {path.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {path.module_count} {isKo ? "모듈" : "modules"}
                      </span>
                      {path.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {path.estimated_hours}h
                        </span>
                      )}
                      {path.project_name && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {path.project_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ===== Section 5: CTA ===== */}
      <div className="mt-16 text-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8">
        <h2 className="text-xl font-bold text-text-primary mb-2">
          지금 시작하기 — 나만의 맞춤 커리큘럼
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          여러분의 프로젝트를 연결하면 AI가 기술 스택을 분석하고, 내 코드를
          교재로 삼아 학습 로드맵을 만들어줍니다. 무료 플랜으로 3개 프로젝트까지
          분석할 수 있어요.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {isKo ? "무료로 시작하기" : "Get Started Free"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
