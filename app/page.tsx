import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Code,
  Brain,
  Cable,
  Cpu,
  BookOpen,
  MessageCircle,
  ChevronDown,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              VibeUniv
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#how-it-works"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              작동 방식
            </a>
            <a
              href="#features"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              기능
            </a>
            <a
              href="#pricing"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              가격
            </a>
            <a
              href="#faq"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_50%)]" />
          <div className="relative mx-auto max-w-6xl px-6 py-28 text-center sm:py-36">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <GraduationCap className="h-4 w-4" />
              내 프로젝트로 배우는 가장 쉬운 방법
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-100">
              만들었으면 반은 왔어요
              <br />
              <span className="bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-400 dark:to-zinc-100">
                나머지 반, 여기서 채워요
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
              AI 코딩 도구로 앱을 만들었나요? 프로젝트를 연결하면 AI가 기술
              스택을 분석하고, 딱 필요한 것만 알려드려요
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                5분만에 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section
          id="how-it-works"
          className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                어떻게 작동하나요?
              </h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                3단계로 프로젝트를 이해하세요
              </p>
            </div>
            <div className="relative mt-16 grid gap-8 md:grid-cols-3">
              {/* Connecting line (desktop) */}
              <div className="absolute top-12 right-1/6 left-1/6 hidden h-px bg-zinc-300 md:block dark:bg-zinc-700" />

              <StepCard
                step={1}
                icon={<Code className="h-6 w-6" />}
                title="프로젝트 연결"
                description="코딩 도구에서 MCP로 원클릭 연결"
              />
              <StepCard
                step={2}
                icon={<Brain className="h-6 w-6" />}
                title="AI가 분석"
                description="기술 스택, 구조, 패턴을 자동으로 파악"
              />
              <StepCard
                step={3}
                icon={<GraduationCap className="h-6 w-6" />}
                title="내 코드로 학습"
                description="내 프로젝트 코드가 교재가 됩니다"
              />
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="border-t border-zinc-200 py-24 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                주요 기능
              </h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                바이브 코더를 위한 올인원 학습 플랫폼
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2">
              <FeatureCard
                icon={<Cable className="h-6 w-6" />}
                title="원클릭 프로젝트 연동"
                description="Claude Code, Cursor 등에서 한 번만 설정하면 끝"
              />
              <FeatureCard
                icon={<Cpu className="h-6 w-6" />}
                title="11개 AI 모델 지원"
                description="Anthropic, OpenAI, Google 등 원하는 모델로 분석"
              />
              <FeatureCard
                icon={<BookOpen className="h-6 w-6" />}
                title="내 코드가 교과서"
                description="추상적인 튜토리얼 대신, 내가 만든 코드로 배워요"
              />
              <FeatureCard
                icon={<MessageCircle className="h-6 w-6" />}
                title="AI 튜터"
                description="모르는 건 바로 물어보세요. 내 코드로 설명해줘요"
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                플랜 &amp; 가격
              </h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                무료로 시작하고, 필요할 때 업그레이드하세요
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {/* Free */}
              <PricingCard
                name="Free"
                price="$0"
                features={[
                  "프로젝트 3개",
                  "기본 기술 스택 분석",
                  "월 1회 학습 로드맵",
                  "월 20회 AI 대화",
                ]}
                ctaLabel="무료로 시작하기"
                ctaHref="/signup"
              />

              {/* Pro */}
              <PricingCard
                name="Pro"
                price="$19"
                isPopular
                features={[
                  "무제한 프로젝트",
                  "심화 분석",
                  "무제한 학습 로드맵",
                  "무제한 AI 대화",
                  "BYOK (자체 LLM 키)",
                ]}
                ctaLabel="Pro 시작하기"
                ctaHref="/signup"
              />

              {/* Team */}
              <PricingCard
                name="Team"
                price="$49"
                features={[
                  "Pro 전체 기능",
                  "팀 프로젝트 공유",
                  "팀 학습 대시보드",
                  "우선 지원",
                ]}
                ctaLabel="Team 시작하기"
                ctaHref="/signup"
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="border-t border-zinc-200 py-24 dark:border-zinc-800">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                자주 묻는 질문
              </h2>
            </div>
            <div className="mt-12 space-y-3">
              <FaqItem
                question="바이브 코딩이 뭔가요?"
                answer="바이브 코딩(Vibe Coding)은 AI 코딩 도구(Claude Code, Cursor, Bolt 등)를 사용하여 직접 코드를 작성하지 않고 앱을 만드는 방식입니다. 프롬프트로 의도를 전달하면 AI가 코드를 생성합니다."
              />
              <FaqItem
                question="MCP는 어떻게 연결하나요?"
                answer="VibeUniv MCP 서버를 npm으로 설치한 후, 사용 중인 코딩 도구(Claude Code, Cursor 등)의 MCP 설정에 추가하면 됩니다. 설정 페이지에서 API 키를 발급받아 사용하세요."
              />
              <FaqItem
                question="어떤 LLM을 지원하나요?"
                answer="Anthropic(Claude), OpenAI(GPT), Google(Gemini), Groq, Mistral, DeepSeek, Cohere, Together AI, Fireworks AI, xAI(Grok), OpenRouter 등 11개 프로바이더를 지원합니다."
              />
              <FaqItem
                question="Free 플랜으로 충분한가요?"
                answer="개인 프로젝트 1-2개를 학습하기에 충분합니다. 프로젝트 3개와 월 20회 AI 대화가 포함됩니다. 더 많은 프로젝트나 무제한 기능이 필요하면 Pro 플랜을 추천합니다."
              />
              <FaqItem
                question="내 코드는 안전한가요?"
                answer="프로젝트 데이터는 암호화되어 저장되며, 분석에 필요한 메타데이터(의존성 파일, 설정 파일 등)만 수집합니다. 소스 코드 전체를 저장하지 않으며, 언제든지 데이터를 삭제할 수 있습니다."
              />
              <FaqItem
                question="BYOK가 뭔가요?"
                answer="BYOK(Bring Your Own Key)는 본인의 LLM API 키를 사용하는 기능입니다. Pro 플랜 이상에서 사용 가능하며, 원하는 LLM 프로바이더의 API 키를 등록하면 해당 모델로 분석과 학습이 진행됩니다."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                VibeUniv
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <Link
                href="/terms"
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                이용약관
              </Link>
              <Link
                href="/privacy"
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                개인정보처리방침
              </Link>
              <a
                href="https://github.com/vibestack"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            &copy; 2026 VibeUniv. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step number */}
      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {step}
      </div>
      {/* Icon */}
      <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  features,
  ctaLabel,
  ctaHref,
  isPopular,
}: {
  name: string;
  price: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border p-8 ${
        isPopular
          ? "border-zinc-900 shadow-lg dark:border-zinc-100"
          : "border-zinc-200 dark:border-zinc-800"
      } bg-white dark:bg-zinc-950`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            인기
          </span>
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {name}
      </h3>
      <div className="mt-3 flex items-baseline">
        <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {price}
        </span>
        <span className="ml-1 text-sm text-zinc-500 dark:text-zinc-400">
          /mo
        </span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`mt-8 flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors ${
          isPopular
            ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {question}
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180 dark:text-zinc-400" />
      </summary>
      <div className="px-5 pb-5 text-sm text-zinc-600 dark:text-zinc-400">
        {answer}
      </div>
    </details>
  );
}
