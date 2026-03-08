import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Contact",
  description: "VibeUniv에 문의하세요. 서비스 이용, 결제, 기술 지원 등 무엇이든 도와드립니다.",
};

export default async function ContactPage() {
  const locale = await getLocale();
  const isKo = locale === "ko";

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {isKo ? "문의하기" : "Contact Us"}
        </h1>
        <p className="text-text-muted">
          {isKo
            ? "궁금한 점이 있으시면 언제든 문의해주세요. 빠르게 답변드리겠습니다."
            : "Have questions? Feel free to reach out. We'll respond quickly."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-12">
        {/* Email */}
        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <Mail className="h-6 w-6 text-violet-400 mb-4" />
          <h3 className="font-semibold text-text-primary mb-1">
            {isKo ? "이메일 문의" : "Email"}
          </h3>
          <p className="text-sm text-text-muted mb-3">
            {isKo
              ? "서비스 이용, 결제, 기술 지원 등 모든 문의"
              : "Service usage, billing, technical support, and more"}
          </p>
          <a
            href="mailto:support@vibeuniv.com"
            className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            support@vibeuniv.com
          </a>
        </div>

        {/* Response Time */}
        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <Clock className="h-6 w-6 text-violet-400 mb-4" />
          <h3 className="font-semibold text-text-primary mb-1">
            {isKo ? "응답 시간" : "Response Time"}
          </h3>
          <p className="text-sm text-text-muted mb-3">
            {isKo
              ? "영업일 기준 24시간 이내 답변"
              : "Response within 24 hours on business days"}
          </p>
          <span className="text-sm text-text-secondary">
            {isKo ? "월-금 09:00 - 18:00 (KST)" : "Mon-Fri 09:00 - 18:00 (KST)"}
          </span>
        </div>
      </div>

      {/* FAQ Reference */}
      <div className="rounded-2xl border border-border-default bg-bg-primary p-8">
        <MessageSquare className="h-6 w-6 text-violet-400 mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {isKo ? "자주 묻는 질문" : "Frequently Asked Questions"}
        </h3>

        <div className="space-y-4 mt-4">
          {(isKo
            ? [
                { q: "무료 플랜으로 뭘 할 수 있나요?", a: "3개 프로젝트 분석, 월 1회 학습 로드맵 생성, 월 20회 AI 튜터 대화를 무료로 이용할 수 있습니다." },
                { q: "MCP 연동은 어떻게 하나요?", a: "Claude Code에서 한 줄 명령으로 연동할 수 있습니다. 자세한 방법은 가이드 페이지를 참고하세요." },
                { q: "내 코드가 서버에 저장되나요?", a: "MCP 연동 시 Local-First 아키텍처로 분석은 로컬에서 수행됩니다. 서버에는 분석 결과만 저장됩니다." },
                { q: "결제는 어떻게 처리되나요?", a: "Stripe를 통해 안전하게 결제됩니다. 구독 관리와 취소는 Stripe Customer Portal에서 직접 할 수 있습니다." },
                { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내 무조건 환불 가능합니다. 7일 이후에는 잔여 기간에 대한 일할 환불이 적용됩니다." },
              ]
            : [
                { q: "What can I do with the Free plan?", a: "You can analyze 3 projects, generate 1 learning roadmap per month, and have 20 AI tutor conversations per month for free." },
                { q: "How do I connect via MCP?", a: "You can connect with a single command in Claude Code. See the Guide page for detailed instructions." },
                { q: "Is my code stored on the server?", a: "With MCP integration, analysis is performed locally using Local-First architecture. Only analysis results are stored on the server." },
                { q: "How is payment processed?", a: "Payments are securely processed through Stripe. Subscription management and cancellation can be done directly in the Stripe Customer Portal." },
                { q: "What is the refund policy?", a: "Full refund available within 7 days of payment. After 7 days, pro-rata refund for the remaining period applies." },
              ]
          ).map(({ q, a }) => (
            <div key={q} className="border-b border-border-default pb-3 last:border-0 last:pb-0">
              <h4 className="text-sm font-medium text-text-primary mb-1">{q}</h4>
              <p className="text-sm text-text-muted">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border-default space-y-2">
          <p className="text-sm text-text-muted">
            {isKo ? "📖 " : "📖 "}
            <Link href="/guide/features" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              {isKo ? "메뉴별 기능 가이드" : "Feature Guide by Menu"}
            </Link>
            {isKo ? " — 각 메뉴의 상세 사용법을 확인하세요." : " — Learn how to use each menu in detail."}
          </p>
          <p className="text-sm text-text-muted">
            {isKo ? "🔬 " : "🔬 "}
            <Link href="/technology" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              {isKo ? "VibeUniv 기술 소개" : "VibeUniv Technology"}
            </Link>
            {isKo ? " — 온톨로지 기반 학습 기술을 알아보세요." : " — Discover our ontology-based learning technology."}
          </p>
          <p className="text-sm text-text-muted">
            {isKo ? "더 많은 FAQ는 " : "For more FAQs, visit the "}
            <Link href="/#faq" className="text-violet-400 hover:text-violet-300 transition-colors">
              {isKo ? "랜딩 페이지" : "landing page"}
            </Link>
            {isKo ? "에서 확인할 수 있습니다." : "."}
          </p>
        </div>
      </div>
    </div>
  );
}
