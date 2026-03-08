import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { getLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Contact",
  description: "VibeUniv에 문의하세요. 서비스 이용, 결제, 기술 지원 등 무엇이든 도와드립니다.",
};

export default async function ContactPage() {
  const locale = await getLocale();
  const isKo = locale === "ko";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact VibeUniv",
    "description": "VibeUniv에 문의하세요.",
    "url": "https://vibeuniv.com/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "VibeUniv",
      "url": "https://vibeuniv.com",
      "email": "support@vibeuniv.com",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@vibeuniv.com",
        "contactType": "customer support",
        "availableLanguage": ["Korean", "English"],
      },
    },
  };

  return (
    <div className="max-w-[800px] mx-auto px-8 max-md:px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: isKo ? "Contact" : "Contact" },
        ]}
      />
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
          {isKo ? "문의 전 확인해주세요" : "Before You Contact Us"}
        </h3>

        <div className="space-y-4 mt-4">
          {(isKo
            ? [
                { q: "비밀번호를 잊어버렸어요", a: "로그인 페이지에서 '비밀번호 찾기'를 클릭하면 등록된 이메일로 재설정 링크가 발송됩니다." },
                { q: "구독을 취소하고 싶어요", a: "설정 > 구독 & 결제에서 Stripe Customer Portal로 이동해 직접 구독을 관리할 수 있습니다. 취소 후에도 결제 기간 동안은 계속 이용 가능합니다." },
                { q: "MCP 연동이 안 돼요", a: "API 키가 올바르게 설정되었는지 확인해주세요. 가이드 페이지에서 단계별 설정 방법을 확인할 수 있습니다. 그래도 안 되면 support@vibeuniv.com으로 문의해주세요." },
                { q: "AI 분석이 실패했어요", a: "파일 크기가 너무 크거나 지원하지 않는 파일 형식일 수 있습니다. 최대 50개 파일, 파일당 100KB 이하를 권장합니다. 지속적인 오류는 이메일로 문의해주세요." },
                { q: "환불은 어떻게 받나요?", a: "결제 후 7일 이내 전액 환불 가능합니다. support@vibeuniv.com으로 환불 요청을 보내주시면 3영업일 이내 처리됩니다." },
              ]
            : [
                { q: "I forgot my password", a: "Click 'Forgot Password' on the login page to receive a reset link via your registered email." },
                { q: "I want to cancel my subscription", a: "Go to Settings > Subscription & Billing and access the Stripe Customer Portal to manage your subscription. You can continue using the service until the end of your billing period." },
                { q: "MCP integration isn't working", a: "Make sure your API key is correctly configured. Check the Guide page for step-by-step setup instructions. If it still doesn't work, contact support@vibeuniv.com." },
                { q: "AI analysis failed", a: "Files may be too large or in an unsupported format. We recommend max 50 files, under 100KB each. For persistent errors, please contact us via email." },
                { q: "How do I get a refund?", a: "Full refund available within 7 days of payment. Send a refund request to support@vibeuniv.com and it will be processed within 3 business days." },
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
