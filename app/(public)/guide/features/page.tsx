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
  Lightbulb,
  Lock,
  Search,
  CheckCircle,
  RefreshCw,
  FileCode,
} from "lucide-react";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Features Guide",
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

function TipBox({ tip }: { tip: string }) {
  return (
    <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <Lightbulb className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
      <p className="text-xs text-text-muted leading-relaxed">{tip}</p>
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
      tip: isKo
        ? "대시보드에서 \"오늘의 넛지\" 배너를 클릭하면 바로 학습 페이지로 이동할 수 있어요. 매일 5분이라도 학습하면 스트릭이 쌓여서 학습 습관을 만들기 좋아요."
        : "Click the \"Daily Nudge\" banner on the dashboard to jump straight to your learning page. Even 5 minutes a day builds a streak and helps form a study habit.",
      features: [
        {
          icon: BarChart3,
          title: isKo ? "프로젝트 현황" : "Project Overview",
          desc: isKo
            ? "등록된 프로젝트 수, 분석 완료된 기술 스택, 최근 활동을 카드 형태로 보여줘요. 각 프로젝트의 분석 상태(대기/진행/완료)도 한눈에 확인할 수 있어요."
            : "See your registered projects, analyzed tech stacks, and recent activity in card format. Check each project's analysis status (pending/in-progress/complete) at a glance.",
        },
        {
          icon: Target,
          title: isKo ? "학습 진행률" : "Learning Progress",
          desc: isKo
            ? "현재 진행 중인 커리큘럼의 완료율과 다음 학습할 모듈을 바로 확인할 수 있어요. 전체 모듈 수 대비 완료 수가 프로그레스 바로 표시돼요."
            : "Check your current curriculum completion rate and see the next module to study. A progress bar shows completed vs total modules.",
        },
        {
          icon: Flame,
          title: isKo ? "학습 스트릭" : "Learning Streak",
          desc: isKo
            ? "연속 학습 일수를 추적해요. 주간 캘린더로 이번 주 학습 현황을 한눈에 볼 수 있고, 최장 연속 기록도 표시돼요."
            : "Track consecutive study days. View this week's learning status on a weekly calendar, plus your longest streak record.",
        },
        {
          icon: Zap,
          title: isKo ? "오늘의 넛지" : "Daily Nudge",
          desc: isKo
            ? "\"오늘 학습하면 3일 연속 스트릭!\" 같은 동기부여 배너가 표시돼요. 학습을 안 한 날에는 다시 시작하도록 격려해줘요."
            : "Motivational banners like \"Study today for a 3-day streak!\" keep you on track. On off-days, it encourages you to jump back in.",
        },
        {
          icon: Medal,
          title: isKo ? "최근 획득 배지" : "Recent Badges",
          desc: isKo
            ? "최근에 획득한 배지와 업적이 대시보드에 표시돼요. 아직 잠긴 배지도 확인해서 다음 목표를 세울 수 있어요."
            : "Recently earned badges and achievements are shown on the dashboard. Locked badges are also visible so you can set your next goal.",
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
      tip: isKo
        ? "MCP 연동을 사용하면 프로젝트 파일을 수동으로 업로드할 필요 없이, AI 코딩 도구에서 한 번의 명령으로 자동 등록돼요. Claude Code, Cursor, Windsurf, Cline, Gemini CLI, Kimi Code, OpenAI Codex를 지원해요."
        : "With MCP integration, you don't need to manually upload project files — a single command from your AI coding tool auto-registers everything. Supports Claude Code, Cursor, Windsurf, Cline, Gemini CLI, Kimi Code, and OpenAI Codex.",
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
            ? "프로젝트의 package.json, 설정 파일, 소스코드를 AI가 분석해서 사용된 기술과 각 기술의 역할을 알려줘요. 11개 AI 모델 중 선택할 수 있어요."
            : "AI analyzes your package.json, config files, and source code to identify technologies and their roles. Choose from 11 AI models.",
        },
        {
          icon: BarChart3,
          title: isKo ? "분석 결과 보기" : "View Analysis Results",
          desc: isKo
            ? "분석된 기술 스택 목록, 각 기술의 카테고리(프레임워크/DB/인증 등), 버전 정보를 깔끔한 카드로 확인해요."
            : "View analyzed tech stacks, categories (framework/DB/auth), and version info in clean cards.",
        },
        {
          icon: FileCode,
          title: isKo ? "소스코드 컨텍스트" : "Source Code Context",
          desc: isKo
            ? "분석 시 소스코드 최대 50개 파일을 전송해요. 커리큘럼 생성과 AI 튜터가 내 실제 코드를 참조해서 맞춤 학습을 제공해요."
            : "Up to 50 source files are transmitted during analysis. The curriculum generator and AI tutor reference your actual code for personalized learning.",
        },
        {
          icon: Lock,
          title: isKo ? "안전한 파일 처리" : "Secure File Handling",
          desc: isKo
            ? ".env, 인증서, 키 파일 등 민감한 파일은 자동으로 제외돼요. node_modules, .git 같은 불필요한 폴더도 전송하지 않아요."
            : "Sensitive files like .env, certificates, and key files are automatically excluded. Unnecessary folders like node_modules and .git are also skipped.",
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
      tip: isKo
        ? "초급 난이도를 선택하면 비유와 일상 예시로 개념을 먼저 설명하고, 코드도 한 줄씩 우리말로 번역해줘요. 프로그래밍 경험이 없어도 이해할 수 있도록 설계됐어요."
        : "Choosing beginner difficulty starts with analogies and everyday examples before code, with line-by-line explanations. Designed so even those with no programming experience can understand.",
      features: [
        {
          icon: BookOpen,
          title: isKo ? "맞춤 커리큘럼" : "Custom Curriculum",
          desc: isKo
            ? "\"커리큘럼 생성\" 버튼 하나로 AI가 내 프로젝트에 맞는 10~15개 모듈의 학습 로드맵을 만들어줘요. 난이도(초급/중급/고급)를 선택할 수 있어요."
            : "One click generates a 10-15 module learning roadmap tailored to your project. Choose your difficulty level (beginner/intermediate/advanced).",
        },
        {
          icon: GraduationCap,
          title: isKo ? "5가지 학습 콘텐츠" : "5 Content Types",
          desc: isKo
            ? "각 모듈은 개념 설명, 코드 예제(before/after 비교 포함), 퀴즈, 코드 챌린지, 되돌아보기로 구성돼요. 이론만이 아니라 실습까지 함께 해요."
            : "Each module includes concept explanations, code examples (with before/after comparisons), quizzes, code challenges, and reflections.",
        },
        {
          icon: CheckCircle,
          title: isKo ? "퀴즈 & 점수 추적" : "Quiz & Score Tracking",
          desc: isKo
            ? "각 모듈의 퀴즈를 풀면 점수가 기록돼요. 최고 점수가 자동 유지되고, 다시 풀어서 더 높은 점수에 도전할 수 있어요."
            : "Quiz scores are recorded for each module. Your best score is automatically kept, and you can retake quizzes to beat your record.",
        },
        {
          icon: RefreshCw,
          title: isKo ? "선수 모듈 시스템" : "Prerequisite System",
          desc: isKo
            ? "모듈 간 선수 관계가 자동으로 계산돼요. 앞 모듈을 먼저 완료해야 다음 모듈이 열리는 구조로, 체계적으로 학습할 수 있어요."
            : "Module prerequisites are automatically calculated. Complete earlier modules to unlock the next ones, ensuring a structured learning path.",
        },
        {
          icon: MessageSquare,
          title: isKo ? "AI 튜터" : "AI Tutor",
          desc: isKo
            ? "학습 중 궁금한 코드를 선택하면 AI 튜터가 내 프로젝트 맥락에서 설명해줘요. 채팅 탭과 Google 검색 탭을 함께 활용할 수 있어요."
            : "Select any code while studying and the AI tutor explains it in your project's context. Use both the chat tab and Google search tab together.",
        },
        {
          icon: Network,
          title: isKo ? "지식 그래프" : "Knowledge Graph",
          desc: isKo
            ? "내가 배운 개념들이 어떻게 연결되는지 시각적으로 볼 수 있어요. 온톨로지 기반으로 개념별 숙련도를 추적하고, 다음에 뭘 배워야 하는지 추천해줘요."
            : "Visually see how concepts you've learned connect. Ontology-based mastery tracking per concept, with recommendations for what to study next.",
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
      tip: isKo
        ? "BYOK(Bring Your Own Key)로 본인의 LLM API 키를 등록하면, Pro 플랜에서 모든 AI 기능을 무제한으로 사용할 수 있어요. 키는 AES-256-GCM으로 암호화되어 저장되니 안심하세요."
        : "Register your own LLM API key with BYOK to unlock unlimited AI features on Pro plan. Your key is encrypted with AES-256-GCM, so rest assured it's safe.",
      features: [
        {
          icon: Key,
          title: isKo ? "API 키 관리" : "API Key Management",
          desc: isKo
            ? "MCP 연동에 필요한 VibeUniv API 키를 발급하고 관리해요. 키는 한 번만 표시되니 안전하게 보관하세요. 여러 개의 키를 만들어 프로젝트별로 사용할 수도 있어요."
            : "Issue and manage VibeUniv API keys for MCP integration. Keys are shown only once — store them safely. You can create multiple keys for different projects.",
        },
        {
          icon: Brain,
          title: isKo ? "LLM 키 등록 (BYOK)" : "LLM Key Registration (BYOK)",
          desc: isKo
            ? "Pro 플랜에서 본인의 LLM API 키를 등록할 수 있어요. Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek 등 11개 프로바이더를 지원해요."
            : "Register your own LLM API keys on Pro plan. Supports 11 providers: Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, and more.",
        },
        {
          icon: Lock,
          title: isKo ? "보안 & 암호화" : "Security & Encryption",
          desc: isKo
            ? "모든 API 키는 AES-256-GCM으로 암호화되어 저장돼요. 키를 평문으로 보관하거나 외부에 전송하지 않아요. 언제든 키를 삭제할 수 있어요."
            : "All API keys are encrypted with AES-256-GCM before storage. Keys are never stored in plaintext or sent externally. You can delete keys anytime.",
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
            : "View current plan, upgrade to Pro/Team, and check billing history. Payments processed securely through Stripe, with subscription management via Stripe Portal.",
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
      tip: isKo
        ? "모듈을 완료하면 축하 confetti 애니메이션이 나와요! 포인트는 모듈 완료(100P), 퀴즈 만점(50P), 연속 학습 보너스 등으로 쌓을 수 있어요."
        : "Completing a module triggers a confetti celebration animation! Earn points through module completion (100P), perfect quiz scores (50P), streak bonuses, and more.",
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
            ? "\"첫 걸음\", \"퀴즈 마스터\", \"꾸준한 학습자\", \"개념 마스터\" 등 10종의 배지를 획득할 수 있어요. 모듈을 완료하면 축하 애니메이션도 나와요!"
            : "Unlock 10 badge types including \"First Step\", \"Quiz Master\", \"Consistent Learner\", \"Concept Master\" and more. Module completion triggers celebration animations!",
        },
        {
          icon: Flame,
          title: isKo ? "스트릭 챌린지" : "Streak Challenge",
          desc: isKo
            ? "주간 목표(2/3/5/7일)를 설정하고 연속 학습에 도전해요. 목표를 달성하면 보너스 포인트를 받아요. 주간 캘린더에서 진행 상황을 확인할 수 있어요."
            : "Set weekly goals (2/3/5/7 days) and challenge yourself. Hitting your goal earns bonus points. Track progress on the weekly calendar.",
        },
        {
          icon: Search,
          title: isKo ? "배지 갤러리" : "Badge Gallery",
          desc: isKo
            ? "획득한 배지와 아직 잠긴 배지를 모두 볼 수 있어요. 각 배지의 획득 조건이 표시되어, 다음 목표를 설정하기 좋아요."
            : "View all earned and locked badges. Each badge shows its unlock conditions, making it easy to set your next goal.",
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
              {section.tip && <TipBox tip={section.tip} />}
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
