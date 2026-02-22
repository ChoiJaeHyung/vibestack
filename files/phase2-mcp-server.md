# Phase 2: VibeStack MCP 서버 개발

`packages/mcp-server/` 디렉토리에 npm 패키지로 배포 가능한 MCP 서버를 만들어줘.

## 1. 프로젝트 구조
```
packages/mcp-server/
├── src/
│   ├── index.ts              # 메인 엔트리포인트 + MCP 서버 초기화
│   ├── tools/
│   │   ├── sync-project.ts   # vibestack_sync_project
│   │   ├── upload-files.ts   # vibestack_upload_files
│   │   ├── analyze.ts        # vibestack_analyze
│   │   ├── get-learning.ts   # vibestack_get_learning
│   │   ├── log-session.ts    # vibestack_log_session
│   │   └── ask-tutor.ts      # vibestack_ask_tutor
│   ├── lib/
│   │   ├── api-client.ts     # VibeStack API 호출 클라이언트
│   │   ├── file-scanner.ts   # 프로젝트 파일 스캐너
│   │   └── config.ts         # 환경변수 파싱
│   └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 2. package.json
```json
{
  "name": "@vibestack/mcp-server",
  "version": "0.1.0",
  "description": "VibeStack MCP Server - Sync your vibe-coded projects for tech stack analysis and learning",
  "type": "module",
  "bin": {
    "vibestack-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc && chmod 755 dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "files": ["dist"],
  "keywords": ["mcp", "vibestack", "vibe-coding", "tech-stack", "learning"]
}
```

## 3. 의존성
- `@modelcontextprotocol/sdk` (MCP TypeScript SDK)
- `zod` (스키마 검증)
- `glob` (파일 스캐닝)

devDependencies:
- `typescript`, `@types/node`, `tsx`

## 4. MCP 서버 초기화 (src/index.ts)
- `McpServer` 생성: name "vibestack-mcp-server", version "0.1.0"
- `StdioServerTransport` 사용 (로컬 실행)
- 환경변수: `VIBESTACK_API_KEY` (필수), `VIBESTACK_API_URL` (선택, 기본값 `https://vibestack.io/api/v1`)
- 모든 로그는 `console.error`로 (stdout은 MCP 프로토콜용이므로)

## 5. 파일 스캐너 (src/lib/file-scanner.ts)
프로젝트 루트에서 기술 스택 관련 파일을 자동 탐지하는 함수:

```typescript
export async function scanProjectFiles(rootDir: string): Promise<ProjectFile[]>
```

탐지 대상 파일:
- **의존성:** `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `Pipfile`, `pyproject.toml`, `build.gradle`, `build.gradle.kts`, `pom.xml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`
- **AI 프로젝트 파일:** `.claude`, `CLAUDE.md`, `.codex`, `.gemini`, `.cursorrules`, `CONVENTIONS.md`, `.windsurfrules`
- **설정 파일:** `tsconfig.json`, `next.config.js`, `next.config.ts`, `next.config.mjs`, `vite.config.ts`, `nuxt.config.ts`, `angular.json`, `docker-compose.yml`, `Dockerfile`, `.env.example`, `vercel.json`, `netlify.toml`
- **기타:** `README.md` (첫 50줄만)

각 파일에서:
- 파일명, 상대 경로, 파일 크기
- 파일 내용 (최대 50KB, 초과 시 잘라서)
- SHA-256 해시 (중복 방지용)

## 6. Tool 구현

### Tool 1: vibestack_sync_project
- **설명:** "Sync current project's tech stack information to VibeStack platform for analysis and learning"
- **입력:** `{ project_name?: string, description?: string }`
- **동작:**
  1. 현재 작업 디렉토리(cwd)에서 `scanProjectFiles()` 호출
  2. API에 POST `/projects` (프로젝트 생성 또는 업데이트)
  3. API에 POST `/projects/{id}/files` (파일 업로드)
  4. 감지된 파일 목록과 동기화 결과 반환
- **annotations:** `{ readOnlyHint: false, destructiveHint: false, openWorldHint: true }`

### Tool 2: vibestack_upload_files
- **설명:** "Upload specific project files to VibeStack for detailed analysis"
- **입력:** `{ project_id: string, file_paths: string[] }`
- **동작:** 지정된 파일들을 읽어서 API에 업로드
- **annotations:** `{ readOnlyHint: false, destructiveHint: false, openWorldHint: true }`

### Tool 3: vibestack_analyze
- **설명:** "Trigger AI analysis of the project's tech stack and get results"
- **입력:** `{ project_id: string }`
- **동작:**
  1. API에 POST `/projects/{id}/analyze` (분석 트리거)
  2. 폴링 또는 대기 후 결과 반환
  3. 감지된 기술 스택을 구조화된 텍스트로 반환
- **annotations:** `{ readOnlyHint: true, openWorldHint: true }`

### Tool 4: vibestack_get_learning
- **설명:** "Get personalized learning recommendations based on the project's tech stack"
- **입력:** `{ project_id: string }`
- **동작:** API에서 학습 경로 조회 후 핵심 내용 반환
- **annotations:** `{ readOnlyHint: true, openWorldHint: true }`

### Tool 5: vibestack_log_session
- **설명:** "Log today's coding session summary to VibeStack"
- **입력:** `{ project_id: string, summary: string, files_changed?: string[] }`
- **동작:** 세션 요약을 API에 전송
- **annotations:** `{ readOnlyHint: false, destructiveHint: false, openWorldHint: true }`

### Tool 6: vibestack_ask_tutor
- **설명:** "Ask the AI tutor a question about your project's tech stack with full project context"
- **입력:** `{ project_id: string, question: string }`
- **동작:** 프로젝트 컨텍스트와 함께 AI 튜터에게 질문 전송, 답변 반환
- **annotations:** `{ readOnlyHint: true, openWorldHint: true }`

## 7. API 클라이언트 (src/lib/api-client.ts)
```typescript
export class VibeStackClient {
  constructor(apiKey: string, baseUrl?: string)
  async createProject(data: CreateProjectInput): Promise<Project>
  async uploadFiles(projectId: string, files: ProjectFile[]): Promise<void>
  async triggerAnalysis(projectId: string): Promise<AnalysisResult>
  async getLearningPath(projectId: string): Promise<LearningPath>
  async logSession(projectId: string, data: SessionLog): Promise<void>
  async askTutor(projectId: string, question: string): Promise<string>
}
```
- 모든 요청에 `Authorization: Bearer {apiKey}` 헤더
- 에러 시 MCP 에러 형식으로 반환 (isError: true)
- fetch 사용 (node 내장)

## 8. README.md
사용자가 설치하고 설정하는 방법을 포함:
- npx 설치 방법
- Claude Code, Cursor, Windsurf, Cline 각각의 설정 방법
- 환경변수 설명
- 사용 예시

## 9. 완료 조건
- `cd packages/mcp-server && npm run build` 성공
- `npx @modelcontextprotocol/inspector node dist/index.js`로 Tool 6개 모두 표시
- 각 Tool의 입력 스키마가 올바르게 정의됨
- API 클라이언트가 에러 핸들링 포함
- README.md 완성
