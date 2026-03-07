import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  GraduationCap,
  Settings,
  Trophy,
  ArrowRight,
  Upload,
  Brain,
  BarChart3,
  BookOpen,
  MessageSquare,
  Network,
  Key,
  CreditCard,
  Globe,
  Flame,
  Medal,
  Star,
  Zap,
  Target,
} from "lucide-react";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Features Guide | VibeUniv",
  description: "VibeUniv의 메뉴별 기능을 상세히 알아보세요. 대시보드, 프로젝트, 학습, 설정, 리워드까지 모든 기능을 안내합니다.",
};

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  desc: string;
}

function FeatureCard({ icon: Icon, title, desc }: FeatureItem) {
  return (
    <div className="flex gap-3 rounded-xl border border-border-default bg-bg-primary p-4">
      <Icon className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
        <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default async function FeaturesGuidePage() {
  const locale = await getLocale();
  const isKo = locale === "ko";

  const sections = [
    {
      id: "dashboard",
      icon: LayoutDashboard,
      color: "from-violet-500 to-purple-500",
      title: isKo ? "대시보드" : "Dashboard",
      desc: isKo
        ? "로그인하면 가장 먼저 보이는 화면이에요. 내 프로젝트와 학습 현황을 한눈에 파악할 수 있어요."
        : "The first screen you see after login. Get an overview of your projects and learning progress at a glance.",
      features: [
        {
          icon: BarChart3,
          title: isKo ? "프로젝트 현황" : "Project Overview",
          desc: isKo
            ? "등록된 프로젝트 수, 분석 완료된 기술 스택, 최근 활동을 카드 형태로 보여줘요."
            : "See your registered projects, analyzed tech stacks, and recent activity in card format.",
        },
        {
          icon: Target,
          title: isKo ? "학습 진행률" : "Learning Progress",
          desc: isKo
            ? "현재 진행 중인 커리큘럼의 완료율과 다음 학습할 모듈을 바로 확인할 수 있어요."
            : "Check your current curriculum completion rate and see the next module to study.",
        },
        {
          icon: Flame,
          title: isKo ? "학습 스트릭" : "Learning Streak",
          desc: isKo
            ? "연속 학습 일수를 추적해요. 주간 캘린더로 이번 주 학습 현황을 한눈에 볼 수 있어요."
            : "Track consecutive study days. View this week's learning status on a weekly calendar.",
        },
        {
          icon: Zap,
          title: isKo ? "오늘의 넛지" : "Daily Nudge",
          desc: isKo
            ? "\"오늘 학습하면 3일 연속 스트릭!\" 같은 동기부여 배너가 표시돼요."
            : "Motivational banners like \"Study today for a 3-day streak!\" keep you on track.",
        },
      ] as FeatureItem[],
    },
    {
      id: "projects",
      icon: FolderOpen,
      color: "from-cyan-500 to-blue-500",
      title: isKo ? "프로젝트" : "Projects",
      desc: isKo
        ? "AI로 만든 프로젝트를 등록하고, AI가 기술 스택을 자동으로 분석해줘요."
        : "Register your AI-built projects and let AI automatically analyze the tech stack.",
      features: [
        {
          icon: Upload,
          title: isKo ? "프로젝트 등록" : "Register Project",
          desc: isKo
            ? "MCP 연동으로 자동 등록하거나, 웹에서 직접 파일을 업로드할 수 있어요. Claude Code, Cursor 등 7개 AI 도구를 지원해요."
            : "Auto-register via MCP integration or upload files directly on the web. Supports 7 AI tools including Claude Code and Cursor.",
        },
        {
          icon: Brain,
          title: isKo ? "AI 기술 스택 분석" : "AI Tech Stack Analysis",
          desc: isKo
            ? "프로젝트의 package.json, 설정 파일, 소스코드를 AI가 분석해서 사용된 기술과 각 기술의 역할을 알려줘요."
            : "AI analyzes your package.json, config files, and source code to identify technologies and their roles.",
        },
        {
          icon: BarChart3,
          title: isKo ? "분석 결과 보기" : "View Analysis Results",
          desc: isKo
            ? "분석된 기술 스택 목록, 각 기술의 카테고리(프레임워크/DB/인증 등), 버전 정보를 깔끔한 카드로 확인해요."
            : "View analyzed tech stacks, categories (framework/DB/auth), and version info in clean cards.",
        },
        {
          icon: FolderOpen,
          title: isKo ? "프로젝트 관리" : "Manage Projects",
          desc: isKo
            ? "여러 프로젝트를 등록하고 관리할 수 있어요. Free 플랜은 3개, Pro는 무제한이에요."
            : "Register and manage multiple projects. Free plan allows 3, Pro is unlimited.",
        },
      ] as FeatureItem[],
    },
    {
      id: "learning",
      icon: GraduationCap,
      color: "from-emerald-500 to-green-500",
      title: isKo ? "학습" : "Learning",
      desc: isKo
        ? "내 프로젝트의 실제 코드를 교재로, AI가 만들어주는 맞춤 커리큘럼으로 학습해요."
        : "Learn with a personalized curriculum using your project's actual code as the textbook.",
      features: [
        {
          icon: BookOpen,
          title: isKo ? "맞춤 커리큘럼" : "Custom Curriculum",
          desc: isKo
            ? "\"커리큘럼 생성\" 버튼 하나로 AI가 내 프로젝트에 맞는 10~15개 모듈의 학습 로드맵을 만들어줘요. 난이도(초급/중급/고급)도 자동으로 설정돼요."
            : "One click generates a 10-15 module learning roadmap tailored to your project. Difficulty (beginner/intermediate/advanced) is auto-set.",
        },
        {
          icon: GraduationCap,
          title: isKo ? "5가지 학습 콘텐츠" : "5 Content Types",
          desc: isKo
            ? "각 모듈은 개념 설명, 코드 예제, 퀴즈, 코드 챌린지, 되돌아보기로 구성돼요. 이론만이 아니라 실습까지 함께 해요."
            : "Each module includes concept explanations, code examples, quizzes, code challenges, and reflections. Theory and practice combined.",
        },
        {
          icon: MessageSquare,
          title: isKo ? "AI 튜터" : "AI Tutor",
          desc: isKo
            ? "학습 중 궁금한 코드를 선택하면 AI 튜터가 내 프로젝트 맥락에서 설명해줘요. 일반적인 답변이 아닌, 내 코드에 특화된 답변을 제공해요."
            : "Select any code while studying and the AI tutor explains it in your project's context. Answers specific to your code, not generic.",
        },
        {
          icon: Network,
          title: isKo ? "지식 그래프" : "Knowledge Graph",
          desc: isKo
            ? "내가 배운 개념들이 어떻게 연결되는지 시각적으로 볼 수 있어요. 어떤 개념을 얼마나 이해했는지, 다음에 뭘 배워야 하는지 한눈에 파악돼요."
            : "Visually see how concepts you've learned connect. Understand your mastery level and what to study next at a glance.",
        },
      ] as FeatureItem[],
    },
    {
      id: "settings",
      icon: Settings,
      color: "from-amber-500 to-orange-500",
      title: isKo ? "설정" : "Settings",
      desc: isKo
        ? "프로필, API 키, LLM 키, 언어, 구독 등 개인 설정을 관리해요."
        : "Manage your profile, API keys, LLM keys, language, and subscription.",
      features: [
        {
          icon: Key,
          title: isKo ? "API 키 관리" : "API Key Management",
          desc: isKo
            ? "MCP 연동에 필요한 VibeUniv API 키를 발급하고 관리해요. 키는 한 번만 표시되니 안전하게 보관하세요."
            : "Issue and manage VibeUniv API keys for MCP integration. Keys are shown only once, so store them safely.",
        },
        {
          icon: Brain,
          title: isKo ? "LLM 키 등록 (BYOK)" : "LLM Key Registration (BYOK)",
          desc: isKo
            ? "Pro 플랜에서 본인의 LLM API 키를 등록할 수 있어요. Anthropic, OpenAI, Google 등 11개 프로바이더를 지원해요. 키는 암호화되어 안전하게 저장돼요."
            : "Register your own LLM API keys on Pro plan. Supports 11 providers including Anthropic, OpenAI, Google. Keys are encrypted and stored securely.",
        },
        {
          icon: Globe,
          title: isKo ? "언어 설정" : "Language Settings",
          desc: isKo
            ? "한국어와 영어 중 선택할 수 있어요. 학습 콘텐츠, AI 튜터 답변, UI 모두 선택한 언어로 제공돼요."
            : "Choose between Korean and English. Learning content, AI tutor responses, and UI are all provided in your chosen language.",
        },
        {
          icon: CreditCard,
          title: isKo ? "구독 & 결제" : "Subscription & Billing",
          desc: isKo
            ? "현재 플랜 확인, Pro/Team 업그레이드, 결제 내역 확인이 가능해요. Stripe를 통해 안전하게 결제되고, 구독 관리는 Stripe Portal에서 직접 할 수 있어요."
            : "View current plan, upgrade to Pro/Team, and check billing history. Payments are securely processed through Stripe, and subscription management is done directly in Stripe Portal.",
        },
      ] as FeatureItem[],
    },
    {
      id: "rewards",
      icon: Trophy,
      color: "from-pink-500 to-rose-500",
      title: isKo ? "리워드" : "Rewards",
      desc: isKo
        ? "학습하면 포인트를 쌓고, 배지를 획득하고, 리워드를 교환할 수 있어요."
        : "Earn points, unlock badges, and exchange rewards as you learn.",
      features: [
        {
          icon: Star,
          title: isKo ? "포인트 시스템" : "Point System",
          desc: isKo
            ? "모듈 완료, 퀴즈 정답, 연속 학습 등 다양한 활동으로 포인트를 쌓아요. 일일/주간 활동 요약도 확인할 수 있어요."
            : "Earn points through module completion, quiz answers, streaks, and more. Daily/weekly activity summaries are available.",
        },
        {
          icon: Medal,
          title: isKo ? "배지 & 업적" : "Badges & Achievements",
          desc: isKo
            ? "\"첫 걸음\", \"퀴즈 마스터\", \"꾸준한 학습자\" 등 다양한 배지를 획득할 수 있어요. 모듈을 완료하면 축하 애니메이션도 나와요!"
            : "Unlock badges like \"First Step\", \"Quiz Master\", \"Consistent Learner\" and more. Completing modules triggers celebration animations!",
        },
        {
          icon: Flame,
          title: isKo ? "스트릭 챌린지" : "Streak Challenge",
          desc: isKo
            ? "주간 목표(2/3/5/7일)를 설정하고 연속 학습에 도전해요. 목표를 달성하면 보너스 포인트를 받아요."
            : "Set weekly goals (2/3/5/7 days) and challenge yourself with consecutive learning. Hitting your goal earns bonus points.",
        },
        {
          icon: Trophy,
          title: isKo ? "리워드 교환" : "Redeem Rewards",
          desc: isKo
            ? "쌓은 포인트로 다양한 리워드를 교환할 수 있어요. 학습할수록 더 많은 혜택을 누릴 수 있어요."
            : "Exchange earned points for various rewards. The more you learn, the more benefits you enjoy.",
        },
      ] as FeatureItem[],
    },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-8 max-md:px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {isKo ? "메뉴별 기능 가이드" : "Features Guide"}
        </h1>
        <p className="text-text-muted max-w-xl mx-auto">
          {isKo
            ? "VibeUniv의 각 메뉴에서 어떤 기능을 사용할 수 있는지 상세히 안내합니다."
            : "A detailed guide to what you can do in each menu of VibeUniv."}
        </p>
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-violet-500/40 hover:text-violet-400 transition-all"
            >
              <Icon className="h-3.5 w-3.5" />
              {s.title}
            </a>
          );
        })}
      </div>

      {/* Sections */}
      <div className="space-y-16">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <section key={section.id} id={section.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                  <SectionIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{section.title}</h2>
                  <p className="text-sm text-text-muted">{section.desc}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 mt-6">
                {section.features.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {isKo ? "직접 사용해보세요" : "Try It Yourself"}
        </h3>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
          {isKo
            ? "무료 플랜으로 모든 핵심 기능을 체험할 수 있어요. 5분이면 시작할 수 있어요."
            : "Experience all core features with the free plan. Get started in 5 minutes."}
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
            href="/guide"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {isKo ? "연동 가이드 보기" : "View Setup Guide"}
          </Link>
        </div>
      </div>
    </div>
  );
}
