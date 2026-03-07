import type { Metadata } from "next";
import { GraduationCap, Zap, Globe, Shield, BookOpen, Code2, Brain, Users } from "lucide-react";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "About | VibeUniv",
  description:
    "VibeUniv는 바이브 코더들이 AI로 만든 프로젝트의 기술 스택을 이해하고 학습할 수 있도록 돕는 교육 플랫폼입니다.",
};

export default async function AboutPage() {
  const locale = await getLocale();
  const isKo = locale === "ko";

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          {isKo ? "VibeUniv 소개" : "About VibeUniv"}
        </h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
          {isKo
            ? "만들었으면 반은 왔어요. 나머지 반, 여기서 채워요."
            : "You've built it — that's half the journey. Complete the other half here."}
        </p>
      </div>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          {isKo ? "미션" : "Mission"}
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          {isKo
            ? "VibeUniv는 바이브 코더(Vibe Coder)들이 AI로 만든 프로젝트의 기술 스택을 이해하고 학습할 수 있도록 돕는 교육 플랫폼입니다. Claude Code, Cursor, Bolt 같은 AI 코딩 도구로 앱을 만드는 건 누구나 할 수 있게 되었지만, 그 코드를 이해하고 유지보수하는 건 여전히 어렵습니다."
            : "VibeUniv is an educational platform helping vibe coders understand and learn the tech stacks of projects they've built with AI. While anyone can now build apps with AI coding tools like Claude Code, Cursor, and Bolt, understanding and maintaining that code remains challenging."}
        </p>
        <p className="text-text-secondary leading-relaxed">
          {isKo
            ? "우리는 이 격차를 해결합니다. 여러분의 실제 프로젝트를 AI가 분석하고, 내 코드가 교재가 되는 맞춤 학습 커리큘럼을 만들어 드립니다. 추상적인 강의가 아니라, 내가 만든 진짜 코드를 보면서 배우는 거예요."
            : "We bridge this gap. AI analyzes your actual project and creates a personalized learning curriculum using your code as the textbook. Not abstract lectures, but learning by looking at the real code you built."}
        </p>
      </section>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          {isKo ? "작동 방식" : "How It Works"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { icon: Code2, title: isKo ? "프로젝트 연결" : "Connect Project", desc: isKo ? "MCP 또는 파일 업로드로 프로젝트를 연결합니다. Claude Code, Cursor, Windsurf 등 7개 AI 도구를 지원합니다." : "Connect your project via MCP or file upload. Supports 7 AI tools including Claude Code, Cursor, and Windsurf." },
            { icon: Brain, title: isKo ? "AI 분석" : "AI Analysis", desc: isKo ? "AI가 프로젝트의 기술 스택을 자동으로 분석합니다. Next.js, React, Supabase 등 어떤 기술이 어떻게 사용되는지 파악합니다." : "AI automatically analyzes your project's tech stack, identifying how technologies like Next.js, React, and Supabase are used." },
            { icon: BookOpen, title: isKo ? "맞춤 커리큘럼" : "Custom Curriculum", desc: isKo ? "내 코드를 교재로 삼아 맞춤 학습 로드맵을 생성합니다. 개념 설명, 코드 워크스루, 퀴즈, 코드 챌린지가 포함됩니다." : "Generates a personalized learning roadmap using your code as the textbook, including explanations, code walkthroughs, quizzes, and challenges." },
            { icon: Users, title: isKo ? "AI 튜터" : "AI Tutor", desc: isKo ? "궁금한 코드를 선택하면 AI 튜터가 내 프로젝트 맥락에서 설명해줍니다. 일반적인 답변이 아닌, 내 코드에 특화된 답변을 제공합니다." : "Select any code and the AI tutor explains it in your project's context, providing answers specific to your code rather than generic responses." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border-default bg-bg-primary p-5">
              <Icon className="h-5 w-5 text-violet-400 mb-3" />
              <h3 className="font-semibold text-text-primary mb-1.5">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          {isKo ? "핵심 특징" : "Key Features"}
        </h2>
        <div className="space-y-4">
          {[
            { icon: Zap, title: isKo ? "Local-First 아키텍처" : "Local-First Architecture", desc: isKo ? "MCP 연동 시 분석과 콘텐츠 생성을 로컬 AI가 직접 수행합니다. 서버 LLM 비용 99.5% 절감, 코드 프라이버시 보장." : "When connected via MCP, analysis and content generation are performed by your local AI. 99.5% server LLM cost reduction with code privacy guaranteed." },
            { icon: Globe, title: isKo ? "11개 LLM 프로바이더 지원" : "11 LLM Providers Supported", desc: isKo ? "Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek 등 11개 프로바이더를 지원합니다. BYOK(Bring Your Own Key)로 자신의 API 키를 사용할 수 있습니다." : "Supports 11 providers including Anthropic, OpenAI, Google, Groq, Mistral, and DeepSeek. Use your own API key with BYOK." },
            { icon: Shield, title: isKo ? "보안 우선" : "Security First", desc: isKo ? "API 키는 AES-256-GCM으로 암호화 저장, 모든 테이블에 Row Level Security 적용, CSP 헤더와 Rate Limiting으로 보호합니다." : "API keys encrypted with AES-256-GCM, Row Level Security on all tables, protected with CSP headers and rate limiting." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 rounded-xl border border-border-default bg-bg-primary p-5">
              <Icon className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Company Info */}
      <section className="rounded-2xl border border-border-default bg-bg-primary p-8">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          {isKo ? "사업자 정보" : "Company Information"}
        </h2>
        <div className="grid gap-3 text-sm">
          {[
            [isKo ? "서비스명" : "Service", "VibeUniv"],
            [isKo ? "도메인" : "Domain", "vibeuniv.com"],
            [isKo ? "사업자등록번호" : "Business Registration", "257-37-01450"],
            [isKo ? "대표" : "Representative", isKo ? "최재형" : "Jaehyung Choi"],
            [isKo ? "이메일" : "Email", "support@vibeuniv.com"],
            [isKo ? "기술 스택" : "Tech Stack", "Next.js 15, TypeScript, Supabase, Stripe, Multi-LLM"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <span className="text-text-muted w-32 shrink-0">{label}</span>
              <span className="text-text-secondary">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
