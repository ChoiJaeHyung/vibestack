import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Network,
  BookOpen,
  Shield,
  Cpu,
  Layers,
  GitBranch,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
} from "lucide-react";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Technology | VibeUniv",
  description:
    "VibeUniv만의 온톨로지 기반 학습 시스템. 지식 그래프, 개념 숙련도 추적, 적응형 커리큘럼으로 AI가 만든 코드를 체계적으로 이해합니다.",
};

export default async function TechnologyPage() {
  const locale = await getLocale();
  const isKo = locale === "ko";

  return (
    <div className="max-w-[900px] mx-auto px-8 max-md:px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          {isKo ? "VibeUniv 핵심 기술" : "VibeUniv Core Technology"}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          {isKo
            ? "AI가 만든 코드를 이해하는 과학"
            : "The Science of Understanding AI-Generated Code"}
        </h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
          {isKo
            ? "VibeUniv는 단순한 교육 플랫폼이 아닙니다. 온톨로지 기반 지식 체계와 적응형 학습 엔진을 결합하여, 각 사용자에게 최적화된 학습 경험을 제공합니다."
            : "VibeUniv isn't just an educational platform. By combining an ontology-based knowledge system with an adaptive learning engine, we deliver a learning experience optimized for each user."}
        </p>
      </div>

      {/* Tech 1: Knowledge Graph */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Network className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {isKo ? "지식 그래프 시스템" : "Knowledge Graph System"}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6 mb-4">
          <p className="text-text-secondary leading-relaxed mb-4">
            {isKo
              ? "도서관에 책이 수천 권 있어도, 분류 체계가 없으면 원하는 책을 찾을 수 없습니다. VibeUniv의 지식 그래프는 프로그래밍 세계의 분류 체계입니다."
              : "Even with thousands of books in a library, you can't find what you need without a classification system. VibeUniv's knowledge graph is the classification system for the programming world."}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Layers,
                title: isKo ? "기술별 개념 분류" : "Concept Classification",
                desc: isKo
                  ? "Next.js, React, TypeScript 등 각 기술마다 핵심 개념들이 체계적으로 분류되어 있어요."
                  : "Core concepts are systematically classified for each technology like Next.js, React, TypeScript.",
              },
              {
                icon: GitBranch,
                title: isKo ? "선행 관계 매핑" : "Prerequisite Mapping",
                desc: isKo
                  ? "\"React Hooks를 배우려면 컴포넌트를 먼저 알아야 해\" 같은 선후 관계를 자동으로 파악해요."
                  : "Automatically identifies prerequisites like \"learn Components before React Hooks.\"",
              },
              {
                icon: Brain,
                title: isKo ? "개인별 숙련도 추적" : "Personal Mastery Tracking",
                desc: isKo
                  ? "각 개념을 얼마나 이해했는지 개인별로 추적하고, 부족한 부분을 자동으로 찾아줘요."
                  : "Track your understanding of each concept individually and automatically find gaps.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border-default bg-bg-surface p-4">
                <Icon className="h-5 w-5 text-violet-400 mb-2" />
                <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-sm text-text-secondary">
            {isKo
              ? "💡 지식 그래프 덕분에 \"App Router를 마스터했으니, 이제 Server Actions를 배울 준비가 되었어요\" 같은 맥락 있는 학습 추천이 가능합니다."
              : "💡 Thanks to the knowledge graph, we can make contextual recommendations like \"You've mastered App Router, so you're ready for Server Actions.\""}
          </p>
        </div>
      </section>

      {/* Tech 2: Adaptive Curriculum */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {isKo ? "적응형 커리큘럼 엔진" : "Adaptive Curriculum Engine"}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6 mb-4">
          <p className="text-text-secondary leading-relaxed mb-6">
            {isKo
              ? "같은 기술을 사용해도 프로젝트마다 코드가 다릅니다. VibeUniv는 여러분의 실제 코드를 분석하여, 그 코드에 맞는 학습 콘텐츠를 생성합니다."
              : "Even with the same technology, every project's code is different. VibeUniv analyzes your actual code and generates learning content tailored to it."}
          </p>

          <div className="space-y-3">
            {[
              {
                step: "1",
                title: isKo ? "프로젝트 분석" : "Project Analysis",
                desc: isKo
                  ? "소스코드를 분석하여 사용된 기술, 패턴, 아키텍처를 자동으로 파악합니다."
                  : "Analyze source code to automatically identify technologies, patterns, and architecture.",
              },
              {
                step: "2",
                title: isKo ? "난이도 자동 조절" : "Auto Difficulty Adjustment",
                desc: isKo
                  ? "프로젝트 복잡도와 사용된 기술 수준에 따라 초급/중급/고급을 자동으로 결정합니다. 초급자에게는 비유와 시각적 설명을 더 많이 제공해요."
                  : "Automatically determine beginner/intermediate/advanced based on project complexity. Beginners get more analogies and visual explanations.",
              },
              {
                step: "3",
                title: isKo ? "내 코드가 교재" : "Your Code as Textbook",
                desc: isKo
                  ? "추상적인 예제가 아니라 여러분이 실제로 만든 코드를 참조하며 설명합니다. \"여러분의 layout.tsx에서 이 부분은...\" 같은 식이에요."
                  : "Explanations reference your actual code, not abstract examples. Like \"In your layout.tsx, this part...\"",
              },
              {
                step: "4",
                title: isKo ? "다양한 학습 활동" : "Diverse Learning Activities",
                desc: isKo
                  ? "개념 설명, 코드 워크스루, 객관식 퀴즈, 코드 챌린지, 되돌아보기 등 다양한 형태로 반복 학습하여 완전한 이해를 도와요."
                  : "Concept explanations, code walkthroughs, quizzes, code challenges, and reflections help you achieve complete understanding through varied repetition.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 rounded-xl border border-border-default bg-bg-surface p-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {step}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                  <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech 3: Local-First AI */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {isKo ? "Local-First AI 아키텍처" : "Local-First AI Architecture"}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6 mb-4">
          <p className="text-text-secondary leading-relaxed mb-6">
            {isKo
              ? "MCP(Model Context Protocol)로 연동하면, AI 분석과 콘텐츠 생성이 여러분의 로컬 환경에서 직접 수행됩니다. 코드가 외부 서버로 전송되지 않아요."
              : "When connected via MCP (Model Context Protocol), AI analysis and content generation run directly in your local environment. Your code never leaves your machine."}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                {isKo ? "코드 프라이버시 보장" : "Code Privacy Guaranteed"}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {isKo
                  ? "분석은 로컬 AI가 수행하고, 서버에는 분석 결과(기술 스택 목록)만 저장됩니다. 소스코드 자체는 절대 서버에 전송되지 않아요."
                  : "Analysis is performed by local AI, and only results (tech stack list) are stored on the server. Your source code is never sent to the server."}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                {isKo ? "비용 효율적" : "Cost Efficient"}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {isKo
                  ? "서버 측 AI 호출을 최소화하여 운영 비용을 대폭 절감했어요. 이 절감된 비용이 합리적인 가격으로 이어집니다."
                  : "By minimizing server-side AI calls, we significantly reduce operating costs. These savings translate to reasonable pricing for you."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-primary p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            {isKo ? "지원하는 AI 코딩 도구" : "Supported AI Coding Tools"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {["Claude Code", "Cursor", "Windsurf", "Cline", "Kimi Code", "Gemini CLI", "OpenAI Codex"].map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs text-text-secondary"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tech 4: Multi-LLM */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {isKo ? "멀티 LLM 지원" : "Multi-LLM Support"}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <p className="text-text-secondary leading-relaxed mb-6">
            {isKo
              ? "하나의 AI 모델에 종속되지 않습니다. 11개 LLM 프로바이더를 지원하여, 각 작업에 가장 적합한 모델을 선택할 수 있어요."
              : "Not locked into a single AI model. With support for 11 LLM providers, you can choose the best model for each task."}
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { name: "Anthropic (Claude)", desc: isKo ? "코드 분석 & 학습 콘텐츠" : "Code analysis & learning content" },
              { name: "OpenAI (GPT)", desc: isKo ? "범용 AI 작업" : "General-purpose AI tasks" },
              { name: "Google (Gemini)", desc: isKo ? "대규모 컨텍스트 처리" : "Large context processing" },
              { name: "Groq / Mistral / DeepSeek", desc: isKo ? "빠르고 경제적인 처리" : "Fast and economical processing" },
            ].map(({ name, desc }) => (
              <div key={name} className="flex items-start gap-2 rounded-lg border border-border-default bg-bg-surface p-3">
                <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-text-primary">{name}</span>
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-text-secondary">
              {isKo
                ? "💡 BYOK(Bring Your Own Key): Pro 플랜에서 본인의 API 키를 등록하면, 원하는 모델을 자유롭게 사용할 수 있어요. 키는 AES-256-GCM으로 암호화되어 안전하게 보관됩니다."
                : "💡 BYOK (Bring Your Own Key): On Pro plan, register your own API key to freely use any model. Keys are encrypted with AES-256-GCM for secure storage."}
            </p>
          </div>
        </div>
      </section>

      {/* Tech 5: Quality Assurance */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {isKo ? "콘텐츠 품질 보장" : "Content Quality Assurance"}
          </h2>
        </div>

        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <p className="text-text-secondary leading-relaxed mb-6">
            {isKo
              ? "AI가 생성한 학습 콘텐츠는 자동 품질 검증을 거칩니다. 기준에 미달하면 자동으로 재생성되어, 항상 높은 품질의 학습 경험을 보장해요."
              : "AI-generated learning content undergoes automatic quality verification. If it doesn't meet standards, it's automatically regenerated to ensure a consistently high-quality learning experience."}
          </p>

          <div className="space-y-3">
            {[
              {
                title: isKo ? "난이도별 맞춤 기준" : "Difficulty-Specific Standards",
                desc: isKo
                  ? "초급자에게는 더 자세한 설명, 더 많은 코드 예제, 더 다양한 퀴즈를 제공합니다. 상급자에게는 핵심만 간결하게 전달해요."
                  : "Beginners get more detailed explanations, more code examples, and more quizzes. Advanced learners get concise, focused content.",
              },
              {
                title: isKo ? "자동 검증 & 재생성" : "Auto Verification & Regeneration",
                desc: isKo
                  ? "생성된 콘텐츠가 품질 기준을 통과하지 못하면 자동으로 재생성합니다. 사용자는 항상 검증된 콘텐츠만 보게 돼요."
                  : "If generated content doesn't pass quality standards, it's automatically regenerated. Users only ever see verified content.",
              },
              {
                title: isKo ? "다국어 콘텐츠" : "Multilingual Content",
                desc: isKo
                  ? "한국어와 영어 모두 네이티브 품질의 학습 콘텐츠를 제공합니다. 번역이 아닌, 각 언어에 최적화된 콘텐츠를 생성해요."
                  : "We provide native-quality learning content in both Korean and English. Not translations, but content optimized for each language.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
                <CheckCircle2 className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                  <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
          {isKo ? "기존 학습 방식과의 차이" : "How We're Different"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
            <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider">
              {isKo ? "기존 방식" : "Traditional"}
            </h3>
            <ul className="space-y-2 text-sm text-text-muted">
              {(isKo
                ? [
                    "❌ 일반적인 예제 코드로 학습",
                    "❌ 모든 사람에게 같은 커리큘럼",
                    "❌ 선행 관계 없이 무작위 학습",
                    "❌ 내 프로젝트와 무관한 내용",
                    "❌ 학습 진도 추적 어려움",
                  ]
                : [
                    "❌ Learn with generic example code",
                    "❌ Same curriculum for everyone",
                    "❌ Random learning without prerequisites",
                    "❌ Content unrelated to your project",
                    "❌ Difficult to track progress",
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-6">
            <h3 className="text-sm font-semibold text-violet-400 mb-4 uppercase tracking-wider">
              VibeUniv
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              {(isKo
                ? [
                    "✅ 내 실제 코드를 교재로 학습",
                    "✅ 프로젝트에 맞춘 1:1 커리큘럼",
                    "✅ 지식 그래프 기반 체계적 학습",
                    "✅ 내 코드 맥락에서 AI 튜터 답변",
                    "✅ 개념별 숙련도 + 스트릭 추적",
                  ]
                : [
                    "✅ Learn with your actual code as textbook",
                    "✅ 1:1 curriculum tailored to your project",
                    "✅ Systematic learning via knowledge graph",
                    "✅ AI tutor answers in your code's context",
                    "✅ Concept mastery + streak tracking",
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {isKo ? "기술의 차이를 직접 경험해보세요" : "Experience the Difference"}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {isKo
            ? "AI로 만든 프로젝트를 연결하면, 온톨로지 기반 맞춤 학습이 시작됩니다."
            : "Connect your AI-built project and start ontology-based personalized learning."}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {isKo ? "무료로 시작하기" : "Get Started Free"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {isKo ? "학습 콘텐츠 미리보기" : "Preview Learning Content"}
          </Link>
        </div>
      </div>
    </div>
  );
}
