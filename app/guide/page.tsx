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

export const metadata = {
  title: "시작 가이드 — 5분 만에 내 프로젝트 연결하기",
  description:
    "Claude Code, Cursor에서 MCP로 프로젝트를 연결하고 AI 맞춤 학습을 시작하는 방법. API 키 발급부터 첫 기술 스택 분석까지 따라하기만 하면 끝.",
};

export default async function GuidePage() {
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
              홈으로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              VibeUniv 시작 가이드
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-text-muted">
              프로젝트를 연결하고 AI 학습을 시작하기까지, 차근차근 따라해 보세요.
              처음이라도 괜찮아요!
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
              title="시작하기 전에"
            >
              <p>아래 3가지만 준비하면 바로 시작할 수 있어요.</p>
              <ul className="mt-4 space-y-3">
                <CheckItem>
                  <strong>AI 코딩 도구</strong> — Claude Code, Cursor, Windsurf,
                  Cline, Kimi Code, OpenAI Codex 중 하나 이상 설치
                </CheckItem>
                <CheckItem>
                  <strong>AI로 만든 프로젝트</strong> — 분석하고 싶은 프로젝트
                  폴더가 로컬에 있어야 해요
                </CheckItem>
                <CheckItem>
                  <strong>LLM API 키</strong> — Anthropic, OpenAI, Google 등
                  원하는 LLM의 API 키 (Pro 플랜 BYOK용. Free 플랜은 불필요)
                </CheckItem>
              </ul>
            </StepSection>

            {/* Step 1 */}
            <StepSection
              step={1}
              icon={<UserPlus className="h-5 w-5" />}
              title="회원가입 & 로그인"
            >
              <p>
                <Link
                  href="/signup"
                  className="font-medium text-text-primary underline underline-offset-4"
                >
                  vibeuniv.com/signup
                </Link>
                에서 이메일로 간단하게 가입하세요.
                이미 계정이 있다면{" "}
                <Link
                  href="/login"
                  className="font-medium text-text-primary underline underline-offset-4"
                >
                  로그인
                </Link>
                하면 됩니다.
              </p>
            </StepSection>

            {/* Step 2 */}
            <StepSection
              step={2}
              icon={<Key className="h-5 w-5" />}
              title="LLM API 키 등록 (선택)"
            >
              <p>
                Pro 플랜 이상에서 BYOK(Bring Your Own Key)를 사용하려면, 본인의
                LLM API 키를 등록하세요. Free 플랜을 사용 중이라면 이 단계는
                건너뛰어도 됩니다.
              </p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>
                  1. 로그인 후{" "}
                  <strong>Settings &gt; LLM Keys</strong> 페이지로 이동
                </li>
                <li>
                  2. 사용할 프로바이더(Anthropic, OpenAI 등) 선택
                </li>
                <li>3. API 키 입력 후 저장</li>
              </ol>
              <InfoBox>
                등록된 키는 AES-256-GCM으로 암호화되어 저장됩니다. VibeUniv가
                키를 평문으로 보관하거나 외부에 전송하지 않아요.
              </InfoBox>
            </StepSection>

            {/* Step 3 */}
            <StepSection
              step={3}
              icon={<KeyRound className="h-5 w-5" />}
              title="VibeUniv API 키 발급"
            >
              <p>
                MCP 서버가 프로젝트를 내 계정에 연결하려면 VibeUniv API 키가
                필요해요.
              </p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>
                  1. <strong>Settings &gt; API Keys</strong> 페이지로 이동
                </li>
                <li>
                  2. <strong>&quot;Create new key&quot;</strong> 클릭
                </li>
                <li>3. 생성된 키를 복사해서 안전한 곳에 저장</li>
              </ol>
              <InfoBox variant="warning">
                API 키는 생성 직후 한 번만 표시됩니다. 반드시 복사해 두세요!
                분실하면 새 키를 발급받아야 합니다.
              </InfoBox>
            </StepSection>

            {/* Step 4 */}
            <StepSection
              step={4}
              icon={<Cable className="h-5 w-5" />}
              title="MCP 서버 연결"
            >
              <p>
                사용 중인 AI 코딩 도구에 MCP 서버 설정을 추가하세요. 도구별 설정
                파일 경로가 다릅니다.
              </p>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Claude Code
              </h4>
              <p className="mt-1 text-sm">
                설정 파일:{" "}
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
        "VIBEUNIV_API_KEY": "여기에_발급받은_API_키"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Cursor
              </h4>
              <p className="mt-1 text-sm">
                설정 파일:{" "}
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
        "VIBEUNIV_API_KEY": "여기에_발급받은_API_키"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Windsurf
              </h4>
              <p className="mt-1 text-sm">
                설정 파일:{" "}
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
        "VIBEUNIV_API_KEY": "여기에_발급받은_API_키"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Cline (VS Code 확장)
              </h4>
              <p className="mt-1 text-sm">
                VS Code에서{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  Cline &gt; MCP Servers &gt; Edit Config
                </code>
                를 열고 아래 내용을 추가하세요.
              </p>
              <CodeBlock>
{`{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "여기에_발급받은_API_키"
      }
    }
  }
}`}
              </CodeBlock>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                Kimi Code CLI
              </h4>
              <p className="mt-1 text-sm">
                설정 파일:{" "}
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
        "VIBEUNIV_API_KEY": "여기에_발급받은_API_키"
      }
    }
  }
}`}
              </CodeBlock>
              <p className="mt-2 text-sm">
                또는 CLI에서 직접 추가할 수도 있어요:{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  kimi mcp
                </code>{" "}
                명령으로 MCP 서버를 관리하고,{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  /mcp
                </code>{" "}
                로 연결 상태를 확인할 수 있습니다.
              </p>

              <h4 className="mt-6 text-sm font-semibold text-text-primary">
                OpenAI Codex CLI
              </h4>
              <p className="mt-1 text-sm">
                설정 파일:{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  ~/.codex/config.toml
                </code>{" "}
                (TOML 형식)
              </p>
              <CodeBlock>
{`[mcp_servers.vibeuniv]
command = "npx"
args = ["-y", "@vibeuniv/mcp-server@latest"]

[mcp_servers.vibeuniv.env]
VIBEUNIV_API_KEY = "여기에_발급받은_API_키"`}
              </CodeBlock>
              <p className="mt-2 text-sm">
                또는 CLI에서 한 줄로 추가할 수 있어요:
              </p>
              <CodeBlock>
{`codex mcp add vibeuniv --env VIBEUNIV_API_KEY=여기에_발급받은_API_키 -- npx -y @vibeuniv/mcp-server@latest`}
              </CodeBlock>
              <p className="mt-2 text-sm">
                프로젝트별 설정은{" "}
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  .codex/config.toml
                </code>{" "}
                (프로젝트 루트)에 추가하면 됩니다.
                CLI와 IDE 확장 모두 같은 설정 파일을 공유해요.
              </p>

              <InfoBox>
                설정 파일을 직접 수정하기 어렵다면, 사용 중인 AI 코딩 도구에게
                그대로 요청하면 됩니다. 예를 들어 Claude Code에서{" "}
                <strong>&quot;MCP 서버 설정에 vibeuniv 추가해줘&quot;</strong>
                라고 말하거나, Cursor에서{" "}
                <strong>&quot;mcp.json에 아래 설정 추가해줘&quot;</strong>
                라고 하면 AI가 알아서 설정 파일을 찾아 추가해 줍니다.
                위의 JSON 설정 코드를 함께 붙여넣으면 더 정확해요!
              </InfoBox>
            </StepSection>

            {/* Step 5 */}
            <StepSection
              step={5}
              icon={<RefreshCw className="h-5 w-5" />}
              title="프로젝트 동기화"
            >
              <p>MCP 설정을 저장했으면, 다음 순서대로 진행하세요.</p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>1. AI 코딩 도구를 완전히 종료 후 다시 시작</li>
                <li>
                  2. 프로젝트 폴더에서 AI에게{" "}
                  <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                    vibeuniv_sync_project
                  </code>{" "}
                  를 호출하도록 요청
                </li>
                <li>
                  3. VibeUniv 대시보드에서 프로젝트가 등록되었는지 확인
                </li>
              </ol>
              <InfoBox>
                동기화는 프로젝트의 설정 파일과 소스 코드 구조만 전송합니다.
                <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                  .env
                </code>
                , 인증서 등 민감한 파일은 자동으로 제외돼요.
              </InfoBox>
            </StepSection>

            {/* Step 6 */}
            <StepSection
              step={6}
              icon={<BarChart3 className="h-5 w-5" />}
              title="기술 스택 분석"
            >
              <p>프로젝트가 등록되면, AI가 기술 스택을 분석할 수 있어요.</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <strong>방법 1:</strong> 대시보드에서 프로젝트를 열고{" "}
                  <strong>&quot;분석&quot;</strong> 버튼 클릭
                </li>
                <li>
                  <strong>방법 2:</strong> AI 도구에서{" "}
                  <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                    vibeuniv_analyze
                  </code>{" "}
                  MCP 도구 호출
                </li>
              </ul>
              <p className="mt-3">
                분석이 완료되면 프레임워크, 라이브러리, 아키텍처 패턴 등을 한눈에
                확인할 수 있습니다.
              </p>
            </StepSection>

            {/* Step 7 */}
            <StepSection
              step={7}
              icon={<BookOpen className="h-5 w-5" />}
              title="학습 시작!"
            >
              <p>분석이 끝나면 진짜 재미있는 부분이 시작돼요.</p>
              <ol className="mt-4 space-y-2 text-sm">
                <li>
                  1. 프로젝트의 <strong>Learning</strong> 탭으로 이동
                </li>
                <li>2. AI가 생성한 맞춤 학습 로드맵 확인</li>
                <li>3. 모듈별로 내 코드 기반 학습 시작</li>
                <li>
                  4. 모르는 건 <strong>AI 튜터</strong>에게 바로 질문
                </li>
              </ol>
              <p className="mt-3">
                추상적인 튜토리얼이 아니라, 내가 만든 코드가 교재가 됩니다.
              </p>
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
                MCP 없이 REST API로 연결하기
              </h2>
            </div>
            <p className="mt-4 text-text-muted">
              MCP를 사용할 수 없는 환경이라면, REST API로 직접 프로젝트를 전송할
              수 있어요. API 키만 있으면 됩니다.
            </p>

            <h3 className="mt-8 text-sm font-semibold text-text-primary">
              1. 프로젝트 생성
            </h3>
            <CodeBlock>
{`curl -X POST https://vibeuniv.com/api/v1/projects \\
  -H "Authorization: Bearer YOUR_VIBEUNIV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-awesome-app"}'`}
            </CodeBlock>

            <h3 className="mt-6 text-sm font-semibold text-text-primary">
              2. 파일 업로드
            </h3>
            <CodeBlock>
{`# 응답에서 받은 프로젝트 ID를 사용하세요
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
              3. 기술 스택 분석 요청
            </h3>
            <CodeBlock>
{`curl -X POST https://vibeuniv.com/api/v1/projects/{project_id}/analyze \\
  -H "Authorization: Bearer YOUR_VIBEUNIV_API_KEY"`}
            </CodeBlock>

            <p className="mt-4 text-sm text-text-muted">
              분석이 완료되면 대시보드에서 결과를 확인하고, 학습 로드맵을 생성할
              수 있어요.
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
                트러블슈팅
              </h2>
            </div>

            <div className="mt-8 space-y-6">
              <TroubleshootItem title="MCP 서버가 연결되지 않아요">
                <ul className="space-y-1.5">
                  <li>
                    설정 파일의 JSON 형식이 올바른지 확인하세요 (쉼표, 중괄호
                    등)
                  </li>
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      VIBEUNIV_API_KEY
                    </code>
                    값이 정확한지 확인하세요
                  </li>
                  <li>
                    Node.js가 설치되어 있는지 확인하세요 (
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      npx
                    </code>
                    가 필요합니다)
                  </li>
                  <li>AI 코딩 도구를 완전히 종료 후 재시작해 보세요</li>
                </ul>
              </TroubleshootItem>

              <TroubleshootItem title="프로젝트가 대시보드에 나타나지 않아요">
                <ul className="space-y-1.5">
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      vibeuniv_sync_project
                    </code>
                    를 다시 호출해 보세요
                  </li>
                  <li>
                    API 키가 올바른 계정의 키인지 확인하세요
                  </li>
                  <li>
                    브라우저에서 대시보드를 새로고침해 보세요
                  </li>
                </ul>
              </TroubleshootItem>

              <TroubleshootItem title="분석이 실패해요">
                <ul className="space-y-1.5">
                  <li>
                    프로젝트에{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      package.json
                    </code>
                    이나{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      requirements.txt
                    </code>{" "}
                    같은 의존성 파일이 있는지 확인
                  </li>
                  <li>
                    BYOK 사용 시, 등록한 LLM API 키가 유효한지 확인하세요
                  </li>
                  <li>
                    잠시 후 다시 시도해 보세요 — 일시적인 LLM 제공자 오류일 수
                    있어요
                  </li>
                </ul>
              </TroubleshootItem>

              <TroubleshootItem title="이전에 VIBESTACK_API_KEY를 사용하고 있었어요">
                <ul className="space-y-1.5">
                  <li>
                    기존{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      VIBESTACK_API_KEY
                    </code>
                    는 그대로 작동합니다 (하위호환)
                  </li>
                  <li>
                    시간이 될 때{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      VIBEUNIV_API_KEY
                    </code>
                    로 변경하는 것을 권장해요
                  </li>
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
                보안 안내
              </h2>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  수집되는 파일
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      package.json
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      requirements.txt
                    </code>
                    {" "}등 의존성 파일
                  </li>
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      tsconfig.json
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      next.config.ts
                    </code>
                    {" "}등 설정 파일
                  </li>
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      CLAUDE.md
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .cursorrules
                    </code>
                    {" "}등 AI 프로젝트 파일
                  </li>
                  <li>
                    소스 코드 (
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .ts
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .tsx
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .py
                    </code>
                    {" "}등 — 최대 50개 파일)
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  자동으로 제외되는 파일
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .env
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .env.*
                    </code>
                    {" "}— 환경변수 파일
                  </li>
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      *.pem
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      *.key
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      id_rsa*
                    </code>
                    {" "}— 인증서/키 파일
                  </li>
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      credentials.json
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      secrets.*
                    </code>
                    {" "}— 인증 정보
                  </li>
                  <li>
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      node_modules/
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      .git/
                    </code>
                    ,{" "}
                    <code className="rounded-lg bg-bg-code px-1.5 py-0.5 text-xs font-mono">
                      dist/
                    </code>
                    {" "}— 빌드/의존성
                  </li>
                </ul>
              </div>
            </div>

            <InfoBox>
              모든 데이터는 HTTPS로 암호화 전송되며, LLM API 키는
              AES-256-GCM으로 암호화 저장됩니다. 프로젝트 데이터는 언제든 완전
              삭제할 수 있어요.
            </InfoBox>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border-default">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-text-primary">
              준비되셨나요?
            </h2>
            <p className="mt-2 text-text-muted">
              프로젝트를 연결하고, 내 코드로 학습을 시작하세요.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 text-base font-medium text-white transition-all hover:shadow-glow-purple"
              >
                시작하기
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
            &copy; 2026 VibeUniv. All rights reserved.
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
                name: "시작 가이드",
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
