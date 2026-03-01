import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/features/landing-nav";
import { TerminalDemo } from "@/components/features/terminal-demo";
import { AnimatedCounter } from "@/components/features/animated-counter";
import { SectionReveal } from "@/components/features/section-reveal";
import { GlowCard } from "@/components/features/glow-card";
import { FaqAccordion } from "@/components/features/faq-accordion";

export const metadata: Metadata = {
  title: "VibeUniv — AI로 만든 앱, 내 코드로 제대로 배우기",
  description:
    "Cursor, Claude Code로 앱을 만들었나요? 프로젝트를 연결하면 AI가 기술 스택을 분석하고, 내 코드가 교재가 되는 맞춤 학습을 시작할 수 있어요. 무료로 지금 시작하세요.",
};

export default async function LandingPage() {
  let userEmail: string | null = null;
  let userPlanType: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("plan_type")
        .eq("id", user.id)
        .single();
      userPlanType = userData?.plan_type ?? "free";
    }
  } catch {
    // auth 실패 시 비로그인 상태로 처리
  }

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      {/* Navigation */}
      <LandingNav userEmail={userEmail} />

      <main>
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center pt-[120px] pb-[80px] px-8 max-md:px-4 relative overflow-hidden">
          {/* Background effects */}
          <div
            className="absolute blur-[80px] opacity-60 pointer-events-none"
            style={{
              top: "-20%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "800px",
              height: "800px",
              background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)",
            }}
          />
          <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />

          <div className="max-w-[1120px] w-full flex items-center gap-16 flex-wrap relative z-10">
            {/* Left - Copy */}
            <div className="flex-[1_1_460px] min-w-[320px]">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[13px] text-violet-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse-dot_2s_infinite]" />
                바이브 코더를 위한 학습 플랫폼
              </div>

              {/* Title */}
              <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.15] tracking-[-1.5px] text-text-primary">
                만들었으면 <span className="gradient-text">반은 왔어요</span>
                <br />
                나머지 반,
                <br />
                여기서 채워요
              </h1>

              {/* Description */}
              <p className="text-[17px] leading-relaxed text-text-muted max-w-[480px] mt-6 mb-9">
                AI 코딩 도구로 앱을 만들었나요?
                <br />
                프로젝트를 연결하면 AI가 기술 스택을 분석하고, 딱 필요한 것만
                알려드려요
              </p>

              {/* CTA Buttons */}
              <div className="flex gap-3.5 items-center flex-wrap">
                {userEmail ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-[15px] font-semibold text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:scale-[1.02] transition-all duration-300"
                    >
                      대시보드로 이동
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/guide"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-bg-input border border-border-strong text-[15px] font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all duration-300"
                    >
                      가이드 보기
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-[15px] font-semibold text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:scale-[1.02] transition-all duration-300"
                    >
                      5분만에 시작하기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/guide"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-bg-input border border-border-strong text-[15px] font-medium text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover transition-all duration-300"
                    >
                      가이드 보기 →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right - Terminal */}
            <TerminalDemo />
          </div>
        </section>

        {/* Social Proof Bar */}
        <SectionReveal className="px-8 max-md:px-4 pb-[80px] flex justify-center">
          <div className="max-w-[900px] w-full flex justify-center gap-12 flex-wrap px-12 py-8 rounded-2xl bg-bg-surface border border-border-default max-md:px-6 max-md:gap-8">
            <div className="text-center min-w-[140px]">
              <div className="text-[32px] font-extrabold mb-1">
                <AnimatedCounter target={500} suffix="+" />
              </div>
              <div className="text-[13px] text-text-faint">프로젝트 분석</div>
            </div>
            <div className="text-center min-w-[140px]">
              <div className="text-[32px] font-extrabold mb-1">
                <AnimatedCounter target={11} suffix="개" />
              </div>
              <div className="text-[13px] text-text-faint">AI 모델 지원</div>
            </div>
            <div className="text-center min-w-[140px]">
              <div className="text-[32px] font-extrabold mb-1">
                <AnimatedCounter target={2400} suffix="+" />
              </div>
              <div className="text-[13px] text-text-faint">학습 모듈 생성</div>
            </div>
          </div>
        </SectionReveal>

        {/* How It Works */}
        <section id="how" className="py-[100px] px-8 max-md:px-4 flex justify-center">
          <div className="max-w-[1120px] w-full">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                어떻게 <span className="gradient-text">작동</span>하나요?
              </h2>
              <p className="text-base text-text-faint max-w-[480px] mx-auto mt-4">
                3단계로 프로젝트를 이해하세요
              </p>
            </SectionReveal>

            <div className="flex flex-col gap-8">
              {STEPS.map((step, i) => (
                <GlowCard key={i} delay={i * 150} glowColor={i % 2 === 0 ? "purple" : "cyan"}>
                  <div className="flex gap-8 items-start flex-wrap">
                    <div className="flex-[1_1_320px] min-w-[280px]">
                      <div className="text-[13px] font-extrabold font-mono gradient-text mb-2">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="text-[28px] mb-3">{step.emoji}</div>
                      <h3 className="text-[22px] font-bold text-text-primary mb-2">
                        {step.title}
                      </h3>
                      <p className="text-[15px] leading-relaxed text-text-muted">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-[1_1_280px] min-w-[260px]">
                      <div className="dark bg-[rgba(0,0,0,0.3)] rounded-[10px] p-4 border border-[rgba(255,255,255,0.05)] font-mono text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">
                        {step.code}
                      </div>
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-[100px] px-8 max-md:px-4 flex justify-center">
          <div className="max-w-[1120px] w-full">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                주요 <span className="gradient-text">기능</span>
              </h2>
              <p className="text-base text-text-faint max-w-[480px] mx-auto mt-4">
                바이브 코더를 위한 올인원 학습 플랫폼
              </p>
            </SectionReveal>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
              {FEATURES.map((feature, i) => (
                <GlowCard key={i} delay={i * 100} glowColor={i % 2 === 0 ? "purple" : "cyan"}>
                  <div className="text-[32px] mb-4">{feature.emoji}</div>
                  <h3 className="text-lg font-bold text-text-primary mb-2.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {feature.description}
                  </p>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-[100px] px-8 max-md:px-4 flex justify-center relative">
          <div
            className="absolute blur-[80px] opacity-40 pointer-events-none"
            style={{
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)",
            }}
          />
          <div className="max-w-[1120px] w-full relative z-10">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                플랜 &amp; <span className="gradient-text">가격</span>
              </h2>
              <p className="text-base text-text-faint max-w-[480px] mx-auto mt-4">
                무료로 시작하고, 필요할 때 업그레이드하세요
              </p>
            </SectionReveal>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 items-stretch">
              <PricingCard
                name="Free"
                planKey="free"
                description="사이드 프로젝트로 시작하기"
                price="₩0"
                features={[
                  "프로젝트 3개",
                  "기본 기술 스택 분석",
                  "월 1회 학습 로드맵",
                  "월 20회 AI 대화",
                ]}
                ctaLabel="무료로 시작하기"
                ctaHref="/signup"
                isLoggedIn={!!userEmail}
                userPlanType={userPlanType}
                checkColor="text-cyan-500"
              />
              <PricingCard
                name="Pro"
                planKey="pro"
                description="본격적으로 성장하기"
                price="₩25,000"
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
                isLoggedIn={!!userEmail}
                userPlanType={userPlanType}
                checkColor="text-violet-500"
              />
              <PricingCard
                name="Team"
                planKey="team"
                description="팀과 함께 학습하기"
                price="₩59,000"
                features={[
                  "Pro 전체 기능",
                  "팀 프로젝트 공유",
                  "팀 학습 대시보드",
                  "우선 지원",
                ]}
                ctaLabel="Team 시작하기"
                ctaHref="/signup"
                isLoggedIn={!!userEmail}
                userPlanType={userPlanType}
                checkColor="text-cyan-500"
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-[100px] pb-[120px] px-8 max-md:px-4 flex justify-center">
          <div className="max-w-[720px] w-full">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-text-primary tracking-tight">
                자주 묻는 <span className="gradient-text">질문</span>
              </h2>
            </SectionReveal>

            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* Final CTA */}
        <SectionReveal className="px-8 max-md:px-4 pb-[120px] flex justify-center">
          <div className="max-w-[800px] w-full text-center px-12 py-16 rounded-3xl bg-gradient-to-b from-violet-500/[0.08] to-cyan-500/[0.04] border border-violet-500/20 relative overflow-hidden max-md:px-6">
            <div
              className="absolute blur-[60px] opacity-50 pointer-events-none"
              style={{
                top: "-30%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "400px",
                height: "400px",
                background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 60%)",
              }}
            />
            <div className="relative z-10">
              <h2 className="text-[32px] font-extrabold text-text-primary tracking-tight">
                지금 바로 시작하세요
              </h2>
              <p className="text-base text-text-muted leading-relaxed max-w-[500px] mx-auto mt-4 mb-8">
                AI로 만든 프로젝트, 이제 진짜 이해할 차례예요.
                <br />
                5분이면 첫 분석을 시작할 수 있어요.
              </p>
              {userEmail ? (
                <Link
                  href="/dashboard"
                  className="inline-block px-10 py-4 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-base font-bold text-white shadow-glow-purple-lg hover:scale-[1.03] transition-all duration-300"
                >
                  대시보드로 이동
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-block px-10 py-4 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-base font-bold text-white shadow-glow-purple-lg hover:scale-[1.03] transition-all duration-300"
                >
                  무료로 시작하기
                </Link>
              )}
            </div>
          </div>
        </SectionReveal>
      </main>

      {/* Footer */}
      <footer className="px-8 max-md:px-4 py-10 border-t border-border-default flex justify-center">
        <div className="max-w-[1120px] w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[11px] font-extrabold text-white">
              V
            </div>
            <span className="text-sm font-semibold text-text-faint">VibeUniv</span>
          </div>
          <div className="flex gap-6 text-[13px] text-text-dim">
            <Link href="/terms" className="hover:text-text-tertiary transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-text-tertiary transition-colors">
              개인정보처리방침
            </Link>
            <a
              href="https://github.com/vibestack"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-tertiary transition-colors"
            >
              GitHub
            </a>
          </div>
          <div className="text-xs text-text-ghost">
            <div>&copy; 2026 VibeUniv. All rights reserved.</div>
            <div className="mt-1">상호명: VibeUniv.Inc | 대표: 최재형 | 사업자등록번호: 257-37-01450</div>
          </div>
        </div>
      </footer>

      {/* FAQ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "바이브 코딩이 뭔가요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "바이브 코딩(Vibe Coding)은 AI 코딩 도구(Claude Code, Cursor, Bolt 등)를 사용하여 프롬프트만으로 앱을 만드는 방식이에요. 문제는 이렇게 만든 앱이 왜 돌아가는지 모를 수 있다는 거예요. VibeUniv는 바로 그 부분을 채워드립니다.",
                },
              },
              {
                "@type": "Question",
                name: "MCP로 프로젝트를 연결하는 방법이 궁금해요",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "MCP(Model Context Protocol)를 사용하면 코딩 도구에서 프로젝트를 자동으로 VibeUniv에 연결할 수 있어요. 1단계: API 키 발급, 2단계: MCP 서버 설정, 3단계: 프로젝트 동기화. 코딩 도구를 재시작하면 자동 연결됩니다.",
                },
              },
              {
                "@type": "Question",
                name: "어떤 AI 모델을 지원하나요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "총 11개 LLM 프로바이더를 지원합니다. Anthropic (Claude), OpenAI (GPT), Google (Gemini), Groq, Mistral, DeepSeek, Cohere, Together AI, Fireworks AI, xAI (Grok), OpenRouter. Pro 플랜에서는 BYOK 기능으로 본인의 API 키를 등록해서 쓸 수 있어요.",
                },
              },
              {
                "@type": "Question",
                name: "Free 플랜으로 충분한가요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "개인 사이드 프로젝트 1~2개를 학습하기에는 충분해요! 프로젝트 3개, 기본 분석, 월 1회 로드맵, 월 20회 AI 대화가 포함됩니다. 더 많은 프로젝트나 무제한 AI 대화가 필요하다면 Pro(₩25,000/월)를 추천해요.",
                },
              },
              {
                "@type": "Question",
                name: "내 코드는 안전하게 보관되나요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "보안은 최우선 사항이에요. 모든 데이터는 암호화되어 전송 및 저장됩니다. 민감한 파일(.env 등)은 자동 제외되고, LLM API 키는 AES-256-GCM으로 암호화됩니다. 언제든 데이터 삭제도 가능해요.",
                },
              },
              {
                "@type": "Question",
                name: "BYOK(Bring Your Own Key)가 뭔가요?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "BYOK는 본인이 가진 LLM API 키를 등록해서 사용하는 기능이에요. Pro 플랜 이상에서 사용할 수 있습니다. Settings > LLM Keys에서 프로바이더를 선택하고 API 키를 입력하면 바로 사용 가능해요.",
                },
              },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ─── Static Data ──────────────────────────────────────────────── */

const STEPS = [
  {
    emoji: "🔌",
    title: "프로젝트 연결",
    description: "코딩 도구에서 MCP로 원클릭 연결. Claude Code, Cursor 등에서 한 번만 설정하면 끝.",
    code: `// claude_desktop_config.json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": { "VIBEUNIV_API_KEY": "your-key" }
    }
  }
}`,
  },
  {
    emoji: "🧠",
    title: "AI가 분석",
    description: "기술 스택, 구조, 패턴을 자동으로 파악. 11개 AI 모델 중 원하는 걸로 분석.",
    code: `✓ Scanning project files...
📦 package.json → Next.js 15, React 19
📦 tsconfig.json → TypeScript (strict)
📦 tailwind.config → Tailwind CSS v4
📦 supabase/ → Supabase (PostgreSQL)
✓ 4 technologies detected`,
  },
  {
    emoji: "🎓",
    title: "내 코드로 학습",
    description: "내 프로젝트 코드가 교재가 됩니다. AI 튜터에게 뭐든 물어보세요.",
    code: `🎓 Learning Path: "Next.js 풀스택 마스터"
├── Module 1: App Router 이해하기
├── Module 2: Server Components vs Client
├── Module 3: Supabase Auth 연동
├── Module 4: API Routes 설계
├── Module 5: 배포와 최적화
└── Module 6: 보안 베스트 프랙티스`,
  },
];

const FEATURES = [
  {
    emoji: "🔌",
    title: "원클릭 프로젝트 연동",
    description: "Claude Code, Cursor 등에서 한 번만 설정하면 끝. MCP로 자동 연결됩니다.",
  },
  {
    emoji: "🤖",
    title: "11개 AI 모델 지원",
    description: "Anthropic, OpenAI, Google 등 원하는 모델로 분석하고 학습하세요.",
  },
  {
    emoji: "📚",
    title: "내 코드가 교과서",
    description: "추상적인 튜토리얼 대신, 내가 만든 코드로 배워요. 진짜 이해가 됩니다.",
  },
  {
    emoji: "💬",
    title: "AI 튜터",
    description: "모르는 건 바로 물어보세요. 내 코드 컨텍스트로 설명해줘요.",
  },
  {
    emoji: "🔐",
    title: "AES-256 암호화",
    description: "모든 API 키와 코드 데이터는 AES-256-GCM으로 암호화되어 안전합니다.",
  },
  {
    emoji: "🔑",
    title: "BYOK (자체 LLM 키)",
    description: "Pro 플랜에서 본인의 API 키를 등록해 원하는 모델로 자유롭게 사용하세요.",
  },
];

const FAQ_ITEMS = [
  {
    question: "바이브 코딩이 뭔가요?",
    answer: (
      <>
        <p>
          바이브 코딩(Vibe Coding)은 AI 코딩 도구(Claude Code, Cursor,
          Bolt 등)를 사용하여 <strong className="text-text-secondary">프롬프트만으로 앱을 만드는 방식</strong>이에요.
          &quot;이런 기능 만들어줘&quot;라고 말하면 AI가 코드를 생성하죠.
        </p>
        <p>
          문제는, 이렇게 만든 앱이 <em>왜</em> 돌아가는지 모를 수 있다는 거예요.
          VibeUniv는 바로 그 부분을 채워드립니다.
        </p>
      </>
    ),
  },
  {
    question: "MCP로 프로젝트를 연결하는 방법이 궁금해요",
    answer: (
      <>
        <p>
          MCP(Model Context Protocol)를 사용하면 코딩 도구에서 프로젝트를
          자동으로 VibeUniv에 연결할 수 있어요.
        </p>
        <p className="font-medium text-text-secondary">1단계: API 키 발급</p>
        <p>
          VibeUniv에 가입한 뒤, Settings &gt; API Keys 페이지에서
          API 키를 발급하세요.
        </p>
        <p className="font-medium text-text-secondary">2단계: MCP 서버 설정</p>
        <p>
          코딩 도구의 MCP 설정 파일에 vibeuniv 서버를 추가하세요.
        </p>
        <p className="font-medium text-text-secondary">3단계: 프로젝트 동기화</p>
        <p>
          코딩 도구를 재시작하면 자동 연결됩니다. 대시보드에서 확인하세요!
        </p>
      </>
    ),
  },
  {
    question: "어떤 AI 모델을 지원하나요?",
    answer: (
      <>
        <p>
          총 <strong className="text-text-secondary">11개 LLM 프로바이더</strong>를 지원합니다.
        </p>
        <p>
          Anthropic (Claude), OpenAI (GPT), Google (Gemini), Groq, Mistral,
          DeepSeek, Cohere, Together AI, Fireworks AI, xAI (Grok), OpenRouter
        </p>
        <p>
          Pro 플랜에서는 BYOK 기능으로 본인의 API 키를 등록해서 쓸 수 있어요.
        </p>
      </>
    ),
  },
  {
    question: "Free 플랜으로 충분한가요?",
    answer: (
      <>
        <p>
          개인 사이드 프로젝트 1~2개를 학습하기에는 충분해요!
          프로젝트 3개, 기본 분석, 월 1회 로드맵, 월 20회 AI 대화가 포함됩니다.
        </p>
        <p>
          더 많은 프로젝트나 무제한 AI 대화가 필요하다면 Pro(₩25,000/월)를 추천해요.
        </p>
      </>
    ),
  },
  {
    question: "내 코드는 안전하게 보관되나요?",
    answer: (
      <>
        <p>보안은 최우선 사항이에요.</p>
        <p>
          모든 데이터는 암호화되어 전송 및 저장됩니다. 민감한 파일(.env 등)은 자동 제외되고,
          LLM API 키는 AES-256-GCM으로 암호화됩니다. 언제든 데이터 삭제도 가능해요.
        </p>
      </>
    ),
  },
  {
    question: "BYOK(Bring Your Own Key)가 뭔가요?",
    answer: (
      <>
        <p>
          BYOK는 <strong className="text-text-secondary">본인이 가진 LLM API 키</strong>를 등록해서 사용하는 기능이에요.
          Pro 플랜 이상에서 사용할 수 있습니다.
        </p>
        <p>
          Settings &gt; LLM Keys에서 프로바이더를 선택하고 API 키를 입력하면 바로 사용 가능해요.
        </p>
      </>
    ),
  },
];

/* ─── Sub-components ──────────────────────────────────────────────── */

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, team: 2 };

function PricingCard({
  name,
  planKey,
  description,
  price,
  features,
  ctaLabel,
  ctaHref,
  isPopular,
  isLoggedIn,
  userPlanType,
  checkColor,
}: {
  name: string;
  planKey: string;
  description: string;
  price: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
  isLoggedIn?: boolean;
  userPlanType?: string | null;
  checkColor: string;
}) {
  const isCurrentPlan = isLoggedIn && userPlanType === planKey;
  const userRank = PLAN_RANK[userPlanType ?? "free"] ?? 0;
  const cardRank = PLAN_RANK[planKey] ?? 0;
  const isUpgrade = isLoggedIn && cardRank > userRank;

  let resolvedLabel = ctaLabel;
  let resolvedHref = ctaHref;
  let disabled = false;

  if (isLoggedIn) {
    if (isCurrentPlan) {
      resolvedLabel = "현재 플랜";
      resolvedHref = "/settings/billing";
      disabled = true;
    } else if (isUpgrade) {
      resolvedLabel = "업그레이드";
      resolvedHref = "/settings/billing";
    } else {
      resolvedLabel = ctaLabel;
      resolvedHref = "/settings/billing";
    }
  }

  return (
    <div
      className={`relative rounded-2xl px-7 py-8 transition-all duration-300 ${
        isPopular
          ? "border border-violet-500/40 bg-gradient-to-b from-violet-500/[0.08] to-cyan-500/[0.04]"
          : "border border-border-default bg-bg-surface hover:border-border-hover"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-b-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-[11px] font-bold text-white tracking-wide">
            POPULAR
          </span>
        </div>
      )}
      <h3 className="text-xl font-bold text-text-primary">{name}</h3>
      <p className="text-[13px] text-text-faint mt-1">{description}</p>
      <div className="mt-4 flex items-baseline">
        <span className="text-[44px] font-extrabold text-text-primary tracking-[-2px]">
          {price}
        </span>
        <span className="ml-1 text-sm text-text-faint">/월</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2.5 text-sm text-text-tertiary"
          >
            <svg
              className={`h-4 w-4 flex-shrink-0 ${checkColor}`}
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
      {disabled ? (
        <span className="mt-8 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-border-default text-sm font-semibold text-text-faint">
          {resolvedLabel}
        </span>
      ) : (
        <Link
          href={resolvedHref}
          className={`mt-8 flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-all duration-300 ${
            isPopular
              ? "bg-gradient-to-br from-violet-500 to-violet-600 shadow-glow-purple-md hover:shadow-glow-purple hover:scale-[1.01]"
              : "bg-bg-surface-hover border border-border-strong hover:bg-bg-input-hover"
          }`}
        >
          {resolvedLabel}
        </Link>
      )}
    </div>
  );
}
