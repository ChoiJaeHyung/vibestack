import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  UserPlus,
  Key,
  KeyRound,
  Cable,
  RefreshCw,
  BarChart3,
  BookOpen,
  Terminal,
  AlertTriangle,
  Shield,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/features/landing-nav";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Guide");
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function GuidePage() {
  const t = await getTranslations("Guide");

  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // auth 실패 시 비로그인 상태로 처리
  }

  const richTags = {
    strong: (chunks: React.ReactNode) => (
      <strong>{chunks}</strong>
    ),
    code: (chunks: React.ReactNode) => (
      <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
        {chunks}
      </code>
    ),
    signupLink: (chunks: React.ReactNode) => (
      <Link
        href="/signup"
        className="font-medium text-text-primary underline underline-offset-4"
      >
        {chunks}
      </Link>
    ),
    loginLink: (chunks: React.ReactNode) => (
      <Link
        href="/login"
        className="font-medium text-text-primary underline underline-offset-4"
      >
        {chunks}
      </Link>
    ),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <LandingNav userEmail={userEmail} />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border-default bg-bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-violet-400"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("hero.back")}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {t("hero.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-text-muted">
              {t("hero.description")}
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="space-y-16">
            {/* Step 0 */}
            <StepSection
              step={0}
              icon={<CheckCircle2 className="h-5 w-5" />}
              title={t("step0.title")}
            >
              <p>{t("step0.intro")}</p>
              <ul className="mt-4 space-y-3">
                <CheckItem>
                  {t.rich("step0.check1", richTags)}
                </CheckItem>
                <CheckItem>
                  {t.rich("step0.check2", richTags)}
                </CheckItem>
                <CheckItem>
                  {t.rich("step0.check3", richTags)}
                </CheckItem>
              </ul>
            </StepSection>

            {/* Step 1 */}
            <StepSection
              step={1}
              icon={<UserPlus className="h-5 w-5" />}
              title={t("step1.title")}
            >
              <p>{t.rich("step1.description", richTags)}</p>
            </StepSection>

            {/* Step 2 */}
            <StepSection
              step={2}
              icon={<Key className="h-5 w-5" />}
              title={t("step2.title")}
            >
              <p>{t("step2.description")}</p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>{t.rich("step2.ol1", richTags)}</li>
                <li>{t("step2.ol2")}</li>
                <li>{t("step2.ol3")}</li>
              </ol>
              <InfoBox>{t("step2.info")}</InfoBox>
            </StepSection>

            {/* Step 3 */}
            <StepSection
              step={3}
              icon={<KeyRound className="h-5 w-5" />}
              title={t("step3.title")}
            >
              <p>{t("step3.description")}</p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>{t.rich("step3.ol1", richTags)}</li>
                <li>{t.rich("step3.ol2", richTags)}</li>
                <li>{t("step3.ol3")}</li>
              </ol>
              <InfoBox variant="warning">{t("step3.warning")}</InfoBox>
            </StepSection>

            {/* Step 4 */}
            <StepSection
              step={4}
              icon={<Cable className="h-5 w-5" />}
              title={t("step4.title")}
            >
              <p>{t("step4.description")}</p>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Claude Code
              </h4>
              <p className="mt-1 text-sm">
                {t("step4.configLabel")}{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  ~/.claude/settings.json
                </code>
              </p>
              <CodeBlock>
{`{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "${t("step4.apiKeyPlaceholder")}"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Cursor
              </h4>
              <p className="mt-1 text-sm">
                {t("step4.configLabel")}{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  ~/.cursor/mcp.json
                </code>
              </p>
              <CodeBlock>
{`{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "${t("step4.apiKeyPlaceholder")}"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Windsurf
              </h4>
              <p className="mt-1 text-sm">
                {t("step4.configLabel")}{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  ~/.codeium/windsurf/mcp_config.json
                </code>
              </p>
              <CodeBlock>
{`{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "${t("step4.apiKeyPlaceholder")}"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Cline (VS Code)
              </h4>
              <p className="mt-1 text-sm">
                {t.rich("step4.cline.description", richTags)}
              </p>
              <CodeBlock>
{`{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "${t("step4.apiKeyPlaceholder")}"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Kimi Code CLI
              </h4>
              <p className="mt-1 text-sm">
                {t("step4.configLabel")}{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  ~/.kimi/mcp.json
                </code>
              </p>
              <CodeBlock>
{`{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "${t("step4.apiKeyPlaceholder")}"
      }
    }
  }
}`}
              </CodeBlock>
              <p className="mt-2 text-sm">
                {t.rich("step4.kimiCode.cliDescription", richTags)}
              </p>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                OpenAI Codex CLI
              </h4>
              <p className="mt-1 text-sm">
                {t("step4.configLabel")}{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  ~/.codex/config.toml
                </code>{" "}
                {t("step4.codex.format")}
              </p>
              <CodeBlock>
{`[mcp_servers.vibeuniv]
command = "npx"
args = ["-y", "@vibeuniv/mcp-server@latest"]

[mcp_servers.vibeuniv.env]
VIBEUNIV_API_KEY = "${t("step4.apiKeyPlaceholder")}"`}
              </CodeBlock>
              <p className="mt-2 text-sm">
                {t("step4.codex.cliDescription")}
              </p>
              <CodeBlock>
{`codex mcp add vibeuniv --env VIBEUNIV_API_KEY=${t("step4.apiKeyPlaceholder")} -- npx -y @vibeuniv/mcp-server@latest`}
              </CodeBlock>
              <p className="mt-2 text-sm">
                {t.rich("step4.codex.projectNote", richTags)}
              </p>

              <InfoBox>
                {t.rich("step4.info", richTags)}
              </InfoBox>
            </StepSection>

            {/* Step 5 */}
            <StepSection
              step={5}
              icon={<RefreshCw className="h-5 w-5" />}
              title={t("step5.title")}
            >
              <p>{t("step5.description")}</p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>{t("step5.ol1")}</li>
                <li>{t.rich("step5.ol2", richTags)}</li>
                <li>{t("step5.ol3")}</li>
              </ol>
              <InfoBox>
                {t.rich("step5.info", richTags)}
              </InfoBox>
            </StepSection>

            {/* Step 6 */}
            <StepSection
              step={6}
              icon={<BarChart3 className="h-5 w-5" />}
              title={t("step6.title")}
            >
              <p>{t("step6.description")}</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>{t.rich("step6.method1", richTags)}</li>
                <li>{t.rich("step6.method2", richTags)}</li>
              </ul>
              <p className="mt-3">{t("step6.result")}</p>
            </StepSection>

            {/* Step 7 */}
            <StepSection
              step={7}
              icon={<BookOpen className="h-5 w-5" />}
              title={t("step7.title")}
            >
              <p>{t("step7.description")}</p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>{t.rich("step7.ol1", richTags)}</li>
                <li>{t("step7.ol2")}</li>
                <li>{t("step7.ol3")}</li>
                <li>{t.rich("step7.ol4", richTags)}</li>
              </ol>
              <p className="mt-3">{t("step7.conclusion")}</p>
            </StepSection>
          </div>
        </section>

        {/* REST API Section */}
        <section className="border-t border-border-default bg-bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
                <Terminal className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                {t("restApi.title")}
              </h2>
            </div>
            <p className="mt-4 text-text-muted">
              {t("restApi.description")}
            </p>

            <h3 className="mt-8 text-sm font-semibold text-text-primary">
              {t("restApi.step1")}
            </h3>
            <CodeBlock>
{`curl -X POST https://vibeuniv.com/api/v1/projects \\
  -H "Authorization: Bearer YOUR_VIBEUNIV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-awesome-app"}'`}
            </CodeBlock>

            <h3 className="mt-6 text-sm font-semibold text-text-primary">
              {t("restApi.step2")}
            </h3>
            <CodeBlock>
{`${t("restApi.projectIdComment")}
curl -X POST https://vibeuniv.com/api/v1/projects/{project_id}/files \\
  -H "Authorization: Bearer YOUR_VIBEUNIV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "files": [
      {"name": "package.json", "content": "..."},
      {"name": "app/page.tsx", "content": "..."}
    ]
  }'`}
            </CodeBlock>

            <h3 className="mt-6 text-sm font-semibold text-text-primary">
              {t("restApi.step3")}
            </h3>
            <CodeBlock>
{`curl -X POST https://vibeuniv.com/api/v1/projects/{project_id}/analyze \\
  -H "Authorization: Bearer YOUR_VIBEUNIV_API_KEY"`}
            </CodeBlock>

            <p className="mt-4 text-sm text-text-muted">
              {t("restApi.conclusion")}
            </p>
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="border-t border-border-default">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                {t("troubleshooting.title")}
              </h2>
            </div>

            <div className="mt-8 space-y-6">
              <TroubleshootItem title={t("troubleshooting.0.title")}>
                <ul className="space-y-1.5">
                  <li>{t("troubleshooting.0.item1")}</li>
                  <li>{t.rich("troubleshooting.0.item2", richTags)}</li>
                  <li>{t.rich("troubleshooting.0.item3", richTags)}</li>
                  <li>{t("troubleshooting.0.item4")}</li>
                </ul>
              </TroubleshootItem>

              <TroubleshootItem title={t("troubleshooting.1.title")}>
                <ul className="space-y-1.5">
                  <li>{t.rich("troubleshooting.1.item1", richTags)}</li>
                  <li>{t("troubleshooting.1.item2")}</li>
                  <li>{t("troubleshooting.1.item3")}</li>
                </ul>
              </TroubleshootItem>

              <TroubleshootItem title={t("troubleshooting.2.title")}>
                <ul className="space-y-1.5">
                  <li>{t.rich("troubleshooting.2.item1", richTags)}</li>
                  <li>{t("troubleshooting.2.item2")}</li>
                  <li>{t("troubleshooting.2.item3")}</li>
                </ul>
              </TroubleshootItem>

              <TroubleshootItem title={t("troubleshooting.3.title")}>
                <ul className="space-y-1.5">
                  <li>{t.rich("troubleshooting.3.item1", richTags)}</li>
                  <li>{t.rich("troubleshooting.3.item2", richTags)}</li>
                </ul>
              </TroubleshootItem>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="border-t border-border-default bg-bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                {t("security.title")}
              </h2>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("security.collected.title")}
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
                  <li>{t.rich("security.collected.item1", richTags)}</li>
                  <li>{t.rich("security.collected.item2", richTags)}</li>
                  <li>{t.rich("security.collected.item3", richTags)}</li>
                  <li>{t.rich("security.collected.item4", richTags)}</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("security.excluded.title")}
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
                  <li>{t.rich("security.excluded.item1", richTags)}</li>
                  <li>{t.rich("security.excluded.item2", richTags)}</li>
                  <li>{t.rich("security.excluded.item3", richTags)}</li>
                  <li>{t.rich("security.excluded.item4", richTags)}</li>
                </ul>
              </div>
            </div>

            <InfoBox>{t("security.info")}</InfoBox>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border-default">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-text-primary">
              {t("cta.title")}
            </h2>
            <p className="mt-2 text-text-muted">
              {t("cta.description")}
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 text-base font-medium text-white transition-all hover:shadow-glow-purple"
              >
                {t("cta.button")}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-400" />
              <span className="font-semibold text-text-primary">
                VibeUniv
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a
                href="https://github.com/vibestack"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-text-primary"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-text-faint">
            {t("footer.copyright")}
          </div>
        </div>
      </footer>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://vibeuniv.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: t("jsonLd.guide"),
                item: "https://vibeuniv.com/guide",
              },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StepSection({
  step,
  icon,
  title,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-14">
      {/* Step badge */}
      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white">
        {step}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-text-muted">{icon}</span>
        <h3 className="text-xl font-semibold text-text-primary">
          {title}
        </h3>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
        {children}
      </div>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-text-muted">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
      <span>{children}</span>
    </li>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl bg-[rgba(0,0,0,0.3)] border border-border-default p-4 text-xs leading-relaxed text-text-secondary font-mono">
      {children}
    </pre>
  );
}

function InfoBox({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning";
}) {
  return (
    <div
      className={`mt-4 rounded-xl border p-4 text-sm ${
        variant === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-border-default bg-bg-input text-text-muted"
      }`}
    >
      {children}
    </div>
  );
}

function TroubleshootItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5">
      <h3 className="font-medium text-text-primary">{title}</h3>
      <div className="mt-3 text-sm text-text-muted">
        {children}
      </div>
    </div>
  );
}
