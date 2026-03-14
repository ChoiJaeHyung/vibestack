import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: "Contact",
    description: t("contact.metaDescription"),
    openGraph: {
      title: "Contact VibeUniv",
      description: t("contact.ogDescription"),
      url: "https://vibeuniv.com/contact",
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("Public");
  const tc = await getTranslations("Common");

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
          { label: tc("breadcrumb.home"), href: "/" },
          { label: tc("nav.contact") },
        ]}
      />
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {t("contact.title")}
        </h1>
        <p className="text-text-muted">
          {t("contact.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-12">
        {/* Email */}
        <div className="rounded-2xl border border-border-default bg-bg-primary p-6">
          <Mail className="h-6 w-6 text-violet-400 mb-4" />
          <h3 className="font-semibold text-text-primary mb-1">
            {t("contact.emailTitle")}
          </h3>
          <p className="text-sm text-text-muted mb-3">
            {t("contact.emailDesc")}
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
            {t("contact.responseTitle")}
          </h3>
          <p className="text-sm text-text-muted mb-3">
            {t("contact.responseDesc")}
          </p>
          <span className="text-sm text-text-secondary">
            {t("contact.responseHours")}
          </span>
        </div>
      </div>

      {/* FAQ Reference */}
      <div className="rounded-2xl border border-border-default bg-bg-primary p-8">
        <MessageSquare className="h-6 w-6 text-violet-400 mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {t("contact.faqTitle")}
        </h3>

        <div className="space-y-4 mt-4">
          {[
            { q: t("contact.faq1Q"), a: t("contact.faq1A") },
            { q: t("contact.faq2Q"), a: t("contact.faq2A") },
            { q: t("contact.faq3Q"), a: t("contact.faq3A") },
            { q: t("contact.faq4Q"), a: t("contact.faq4A") },
            { q: t("contact.faq5Q"), a: t("contact.faq5A") },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border-default pb-3 last:border-0 last:pb-0">
              <h4 className="text-sm font-medium text-text-primary mb-1">{q}</h4>
              <p className="text-sm text-text-muted">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border-default space-y-2">
          <p className="text-sm text-text-muted">
            {"📖 "}
            <Link href="/guide/features" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              {t("contact.linkFeatureGuide")}
            </Link>
            {t("contact.linkFeatureGuideSuffix")}
          </p>
          <p className="text-sm text-text-muted">
            {"🔬 "}
            <Link href="/technology" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
              {t("contact.linkTechnology")}
            </Link>
            {t("contact.linkTechnologySuffix")}
          </p>
          <p className="text-sm text-text-muted">
            {t("contact.linkFaqPrefix")}
            <Link href="/#faq" className="text-violet-400 hover:text-violet-300 transition-colors">
              {t("contact.linkFaqLink")}
            </Link>
            {t("contact.linkFaqSuffix")}
          </p>
        </div>
      </div>
    </div>
  );
}
