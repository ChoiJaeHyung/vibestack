export interface BlogPost {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  date: string;
  category: string;
  readTime: number;
  body: string;
  bodyEn: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-vibe-coding",
    title: "바이브 코딩이란? AI로 앱 만드는 새로운 방법",
    titleEn: "What is Vibe Coding? A New Way to Build Apps with AI",
    description: "바이브 코딩의 개념부터 대표 도구, 장단점, 그리고 바이브 코더가 다음 단계로 나아가는 방법까지 상세히 알아봅니다.",
    descriptionEn: "Learn about vibe coding from concept to popular tools, pros and cons, and how vibe coders can level up.",
    date: "2026-03-01",
    category: "개념",
    readTime: 8,
    body: `## 바이브 코딩, 들어보셨나요?

2025년부터 개발 커뮤니티에서 가장 뜨거운 키워드 중 하나가 바로 **바이브 코딩(Vibe Coding)**입니다. Andrej Karpathy가 처음 이 용어를 사용했는데, 핵심은 간단해요. **AI에게 자연어로 지시하면, AI가 코드를 작성해주는 것**입니다.

기존 개발과의 가장 큰 차이점은 개발자가 코드를 한 줄 한 줄 직접 작성하지 않는다는 점이에요. 대신 "로그인 페이지 만들어줘", "결제 기능 추가해" 같은 자연어 명령을 AI에게 전달하면, AI가 전체 코드를 생성해줍니다.

## 대표 도구들

바이브 코딩을 가능하게 하는 도구들은 계속 늘어나고 있어요.

### Claude Code
Anthropic이 만든 CLI 기반 AI 코딩 도구입니다. 터미널에서 자연어로 지시하면 파일을 생성하고, 수정하고, 테스트까지 실행해요. 프로젝트 전체 컨텍스트를 이해하기 때문에 대규모 리팩토링이나 복잡한 기능 추가에 특히 강합니다.

### Cursor
VS Code 기반의 AI 코드 에디터입니다. 코드를 작성하는 동안 실시간으로 AI가 제안을 해주고, Cmd+K로 자연어 명령을 입력할 수 있어요. IDE와 AI가 완전히 통합되어 있어서 기존 개발 워크플로우에 자연스럽게 녹아듭니다.

### Bolt, Lovable, v0
웹 브라우저에서 직접 앱을 만들 수 있는 도구들이에요. "쇼핑몰 만들어줘"라고 입력하면 실시간으로 UI가 생성되는 걸 볼 수 있죠. 프론트엔드 프로토타입을 빠르게 만들 때 특히 유용합니다.

### Windsurf, Kimi Code
IDE 기반 AI 코딩 도구로, 각각 독특한 강점을 가지고 있어요. Windsurf는 Cascade라는 독자적인 AI 에이전트로 멀티스텝 작업을 자동화하고, Kimi Code는 대규모 컨텍스트 처리에 강점이 있습니다.

## 바이브 코딩의 장점

**1. 진입 장벽 대폭 낮춤**
프로그래밍 경험이 없어도 아이디어만 있으면 앱을 만들 수 있어요. 스타트업 창업자, 디자이너, 기획자 등 비개발자들이 직접 프로토타입을 만들 수 있게 되었습니다.

**2. 개발 속도 극대화**
기존에 몇 주 걸리던 작업을 몇 시간 만에 완성할 수 있어요. AI가 보일러플레이트 코드를 자동으로 생성해주니까요.

**3. 다양한 기술 스택 실험 가능**
직접 배우지 않아도 AI의 도움으로 React, Next.js, Supabase 같은 최신 기술을 활용한 앱을 만들어볼 수 있어요.

## 바이브 코딩의 한계

하지만 바이브 코딩에도 분명한 한계가 있어요.

**1. "내 코드"를 이해할 수 없다**
AI가 만들어준 코드가 왜 그렇게 작동하는지 모르면, 문제가 생겼을 때 해결할 수 없어요. 에러 메시지를 AI에게 다시 던져도, 맥락을 모르면 더 꼬이기만 합니다.

**2. 유지보수가 어렵다**
코드를 이해하지 못하면 기능 추가나 수정이 계속 AI에게 의존하게 됩니다. AI가 제안한 수정이 다른 부분을 깨뜨리는 경우도 흔하죠.

**3. 보안 취약점 간과**
AI가 생성한 코드에 SQL 인젝션, XSS 같은 보안 취약점이 포함될 수 있어요. 코드를 이해하지 못하면 이런 문제를 발견할 수 없습니다.

## 바이브 코더의 다음 단계

바이브 코딩으로 앱을 만들었다면, 이미 절반은 온 거예요. 나머지 절반은 **내가 만든 코드를 이해하는 것**입니다.

이게 바로 VibeUniv가 해결하려는 문제예요. 여러분이 AI로 만든 프로젝트를 연결하면, AI가 기술 스택을 분석하고 내 실제 코드를 교재로 삼아 맞춤 학습 커리큘럼을 만들어줍니다.

**만들었으면 반은 왔어요. 나머지 반, VibeUniv에서 채워보세요.**`,
    bodyEn: `## Have You Heard of Vibe Coding?

Since 2025, one of the hottest keywords in the development community has been **Vibe Coding**. Andrej Karpathy first coined this term, and the core idea is simple: **you give instructions to AI in natural language, and AI writes the code for you**.

The biggest difference from traditional development is that developers don't write code line by line. Instead, you give natural language commands like "create a login page" or "add payment functionality," and AI generates the entire code.

## Popular Tools

Tools enabling vibe coding continue to grow.

### Claude Code
An AI coding tool built by Anthropic that runs in the terminal. Give it natural language instructions and it creates files, modifies code, and even runs tests. It understands your entire project context, making it especially powerful for large-scale refactoring and complex feature additions.

### Cursor
A VS Code-based AI code editor. AI provides real-time suggestions while you write code, and you can input natural language commands with Cmd+K. The IDE and AI are fully integrated, naturally fitting into existing development workflows.

### Bolt, Lovable, v0
Tools that let you build apps directly in the browser. Type "build a shopping mall" and watch the UI generate in real-time. Especially useful for rapid frontend prototyping.

### Windsurf, Kimi Code
IDE-based AI coding tools with unique strengths. Windsurf automates multi-step tasks with its proprietary Cascade AI agent, while Kimi Code excels at large-context processing.

## Advantages of Vibe Coding

**1. Dramatically Lower Entry Barrier**
Even without programming experience, you can build apps with just an idea. Non-developers like startup founders, designers, and planners can now create prototypes themselves.

**2. Maximized Development Speed**
Work that used to take weeks can be completed in hours. AI automatically generates boilerplate code for you.

**3. Experiment with Various Tech Stacks**
You can build apps using modern technologies like React, Next.js, and Supabase without learning them first, with AI's help.

## Limitations of Vibe Coding

But vibe coding has clear limitations too.

**1. You Can't Understand "Your Code"**
If you don't know why AI-generated code works the way it does, you can't fix problems when they arise. Throwing error messages back at AI without context often makes things worse.

**2. Maintenance is Difficult**
Without understanding the code, adding features or making modifications keeps you dependent on AI. AI-suggested fixes breaking other parts is common.

**3. Security Vulnerabilities Overlooked**
AI-generated code can contain security vulnerabilities like SQL injection and XSS. Without understanding the code, you can't catch these issues.

## The Next Step for Vibe Coders

If you've built an app with vibe coding, you're already halfway there. The other half is **understanding the code you've created**.

This is exactly the problem VibeUniv solves. Connect your AI-built project, and AI analyzes your tech stack and creates a personalized learning curriculum using your actual code as the textbook.

**You've built it — that's half the journey. Complete the other half at VibeUniv.**`,
  },
  {
    slug: "understand-your-tech-stack",
    title: "내가 만든 앱의 기술 스택, 제대로 이해하기",
    titleEn: "Understanding Your App's Tech Stack Properly",
    description: "AI가 만들어준 코드 속 기술 스택을 분석하고 이해하는 방법. Next.js, React, Supabase 등 주요 기술의 역할을 알아봅니다.",
    descriptionEn: "How to analyze and understand the tech stack in your AI-generated code. Learn the roles of key technologies like Next.js, React, and Supabase.",
    date: "2026-03-03",
    category: "학습",
    readTime: 7,
    body: `## AI가 골라준 기술, 왜 그걸 쓰는 걸까?

Claude Code에게 "풀스택 웹 앱 만들어줘"라고 하면, 대부분 비슷한 기술 조합을 추천합니다. **Next.js + React + Tailwind CSS + Supabase**. 그런데 이 기술들이 각각 무슨 역할을 하는지 알고 계신가요?

기술 스택을 이해하는 건 **건물의 설계도를 읽는 것**과 같아요. 설계도를 모르면 벽을 허물어도 되는지, 전선이 어디로 지나가는지 알 수 없듯이, 기술 스택을 모르면 코드를 안전하게 수정할 수 없습니다.

## 웹 앱의 기본 구조

모든 웹 앱은 크게 세 부분으로 나뉩니다.

### 프론트엔드 (Frontend)
사용자가 보고 클릭하는 화면이에요. HTML, CSS, JavaScript가 기본이고, 여기에 **React**가 UI를 컴포넌트 단위로 관리해줍니다.

### 백엔드 (Backend)
데이터를 저장하고, 로그인을 처리하고, 비즈니스 로직을 실행하는 서버 쪽이에요. **Supabase**는 PostgreSQL 데이터베이스와 인증을 한 번에 제공하는 Backend-as-a-Service입니다.

### 프레임워크 (Framework)
프론트엔드와 백엔드를 하나로 묶어주는 뼈대에요. **Next.js**는 React 기반 풀스택 프레임워크로, 서버 사이드 렌더링, 라우팅, API 라우트를 모두 제공합니다.

## 기술별 역할 파악하기

### Next.js — 전체 구조의 뼈대
Next.js는 "폴더 이름이 곧 URL"인 파일 시스템 기반 라우팅을 사용해요. \`app/dashboard/page.tsx\`를 만들면 자동으로 \`/dashboard\` 경로가 생기죠. 또한 서버 컴포넌트와 클라이언트 컴포넌트를 구분해서 성능을 최적화합니다.

### React — UI 컴포넌트 관리
React는 화면을 작은 "컴포넌트"로 쪼개서 관리해요. 버튼 하나, 카드 하나가 모두 독립적인 컴포넌트입니다. \`useState\`로 상태를 관리하고, \`useEffect\`로 데이터를 가져오는 패턴이 핵심이에요.

### Tailwind CSS — 디자인 시스템
CSS를 직접 작성하는 대신, \`className="bg-blue-500 text-white p-4"\` 같은 유틸리티 클래스로 스타일링합니다. 빠르게 일관된 디자인을 만들 수 있어요.

### Supabase — 데이터와 인증
PostgreSQL 데이터베이스를 웹 대시보드로 관리할 수 있고, 이메일/소셜 로그인, 파일 스토리지까지 제공합니다. Row Level Security(RLS)로 데이터 보안도 챙길 수 있어요.

### TypeScript — 타입 안전성
JavaScript에 타입을 추가한 언어에요. \`name: string\`, \`age: number\`처럼 변수 타입을 선언하면, 코드 작성 중에 버그를 미리 잡아줍니다.

## 내 프로젝트의 기술 스택 분석하기

가장 쉬운 방법은 \`package.json\` 파일을 확인하는 거예요. 여기에 프로젝트가 사용하는 모든 라이브러리가 나열되어 있거든요.

\`\`\`json
{
  "dependencies": {
    "next": "15.x",      // 프레임워크
    "react": "19.x",     // UI 라이브러리
    "@supabase/supabase-js": "2.x", // 데이터베이스
    "tailwindcss": "4.x" // 스타일링
  }
}
\`\`\`

하지만 \`package.json\`만으로는 각 기술이 프로젝트에서 **어떻게** 사용되는지 알기 어렵습니다. VibeUniv는 AI가 프로젝트의 실제 코드를 분석해서, 각 기술이 어떤 역할을 하는지 자세히 알려줍니다.

## 이해하면 뭐가 달라질까?

기술 스택을 이해하면 세 가지가 달라집니다.

**1. 디버깅이 쉬워져요** — "이 에러는 Supabase RLS 정책 문제야"라고 바로 파악할 수 있어요.

**2. 기능 추가가 자신감 있어요** — "이 기능은 Server Action으로 구현하면 되겠다"라고 판단할 수 있어요.

**3. AI와의 대화가 효율적이에요** — "Next.js의 middleware에서 인증 체크를 추가해줘"처럼 구체적인 지시를 할 수 있어요.

내가 만든 앱의 기술 스택을 제대로 이해하는 것, 그것이 바이브 코더에서 진짜 개발자로 성장하는 첫걸음입니다.`,
    bodyEn: `## The Tech AI Chose — Why Those Technologies?

When you tell Claude Code "build a fullstack web app," it typically recommends a similar tech combination: **Next.js + React + Tailwind CSS + Supabase**. But do you know what role each of these technologies plays?

Understanding your tech stack is like **reading a building's blueprint**. Without the blueprint, you can't know which walls are load-bearing or where the wiring runs. Similarly, without understanding your tech stack, you can't safely modify code.

## Basic Structure of a Web App

Every web app divides into three main parts.

### Frontend
The screens users see and interact with. HTML, CSS, and JavaScript are the basics, with **React** managing the UI in component units.

### Backend
The server side that stores data, handles authentication, and runs business logic. **Supabase** provides a PostgreSQL database and authentication as a Backend-as-a-Service.

### Framework
The skeleton that ties frontend and backend together. **Next.js** is a React-based fullstack framework providing server-side rendering, routing, and API routes.

## Understanding Each Technology's Role

### Next.js — The Structural Skeleton
Next.js uses file-system-based routing where "folder names become URLs." Create \`app/dashboard/page.tsx\` and the \`/dashboard\` route is automatically created. It also distinguishes between Server Components and Client Components for performance optimization.

### React — UI Component Management
React splits the screen into small "components." Each button, each card is an independent component. Managing state with \`useState\` and fetching data with \`useEffect\` are core patterns.

### Tailwind CSS — Design System
Instead of writing CSS directly, you style with utility classes like \`className="bg-blue-500 text-white p-4"\`. Quick to create consistent designs.

### Supabase — Data and Authentication
Manage a PostgreSQL database through a web dashboard, with email/social login and file storage included. Row Level Security (RLS) handles data security.

### TypeScript — Type Safety
A language that adds types to JavaScript. Declaring variable types like \`name: string\`, \`age: number\` catches bugs during coding.

## Analyzing Your Project's Tech Stack

The easiest way is to check your \`package.json\` file, which lists all libraries your project uses.

\`\`\`json
{
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "@supabase/supabase-js": "2.x",
    "tailwindcss": "4.x"
  }
}
\`\`\`

But \`package.json\` alone doesn't tell you **how** each technology is used in your project. VibeUniv uses AI to analyze your project's actual code and explain each technology's role in detail.

## What Changes When You Understand?

Understanding your tech stack changes three things:

**1. Debugging becomes easier** — You can immediately identify "this error is a Supabase RLS policy issue."

**2. Adding features feels confident** — You can judge "this feature should be implemented as a Server Action."

**3. Conversations with AI become efficient** — You can give specific instructions like "add an auth check in Next.js middleware."

Properly understanding the tech stack of the app you built — that's the first step from vibe coder to real developer.`,
  },
  {
    slug: "claude-code-fullstack-guide",
    title: "Claude Code로 풀스택 앱 만들기 실전 가이드",
    titleEn: "Practical Guide to Building Fullstack Apps with Claude Code",
    description: "Claude Code를 활용해 풀스택 웹 애플리케이션을 만드는 과정을 단계별로 안내합니다. 프로젝트 설정부터 배포까지.",
    descriptionEn: "Step-by-step guide to building fullstack web applications with Claude Code. From project setup to deployment.",
    date: "2026-03-04",
    category: "가이드",
    readTime: 10,
    body: `## Claude Code, 어디서부터 시작할까?

Claude Code는 Anthropic이 만든 터미널 기반 AI 코딩 도구입니다. VS Code 같은 에디터가 아니라 터미널에서 직접 작동하기 때문에, 프로젝트의 모든 파일에 접근하고 수정할 수 있는 강력한 도구예요.

이 가이드에서는 Claude Code로 실제 풀스택 웹 앱을 만드는 과정을 단계별로 안내합니다.

## 1단계: 프로젝트 초기화

터미널을 열고 새 프로젝트를 시작해요.

\`\`\`bash
mkdir my-app && cd my-app
claude
\`\`\`

Claude Code가 실행되면 자연어로 지시합니다.

> "Next.js 15 + TypeScript + Tailwind CSS + Supabase를 사용하는 풀스택 웹 앱을 만들어줘. App Router를 사용하고, 사용자 인증과 CRUD 기능이 있는 할 일 관리 앱이야."

Claude Code는 이 지시를 바탕으로 프로젝트 구조를 생성하고, 필요한 패키지를 설치하고, 기본 코드를 작성합니다.

## 2단계: 데이터베이스 설계

Supabase 대시보드에서 테이블을 만들 수도 있지만, Claude Code에게 맡기면 더 빨라요.

> "Supabase에 todos 테이블을 만들어줘. id(uuid), title(text), completed(boolean), user_id(uuid), created_at(timestamp) 컬럼이 필요하고, RLS 정책도 설정해줘."

Claude Code는 SQL 마이그레이션 파일을 생성하고, Row Level Security 정책까지 작성해줍니다.

## 3단계: API와 서버 액션 구현

Next.js 15에서는 Server Actions를 사용해 서버 사이드 로직을 구현할 수 있어요.

> "할 일 추가, 수정, 삭제, 조회 기능을 Server Action으로 구현해줘. Supabase 클라이언트를 사용하고, 인증된 사용자만 접근할 수 있도록 해."

Claude Code는 \`server/actions/\` 디렉토리에 타입 안전한 Server Action 함수들을 생성합니다.

## 4단계: UI 컴포넌트 구현

> "할 일 목록 페이지를 만들어줘. 카드 형태로 할 일을 보여주고, 체크박스로 완료 표시, 삭제 버튼이 있어야 해. Tailwind CSS로 깔끔하게 디자인해줘."

React 컴포넌트가 생성되고, Server Action과 연결됩니다.

## 5단계: 인증 연동

> "Supabase Auth로 이메일 로그인/회원가입 기능을 추가해줘. 미들웨어에서 인증 체크를 하고, 비로그인 사용자는 로그인 페이지로 리다이렉트해."

인증 관련 페이지, 미들웨어, 보호된 라우트가 생성됩니다.

## 6단계: 배포

> "Vercel에 배포할 수 있도록 설정해줘. 환경변수 목록도 알려줘."

\`vercel.json\` 설정과 필요한 환경변수 목록이 생성됩니다.

## 만든 뒤에 해야 할 것

앱을 만들었다면, 이제 중요한 건 **내 코드를 이해하는 것**입니다.

Claude Code가 만들어준 코드 속에는 수많은 패턴과 개념이 숨어 있어요. Server Component와 Client Component의 차이, RLS 정책의 작동 원리, 미들웨어의 역할 등을 이해해야 진정한 개발자로 성장할 수 있습니다.

VibeUniv는 이 과정을 도와줍니다. 프로젝트를 연결하면 AI가 기술 스택을 분석하고, 내 실제 코드를 교재로 삼아 맞춤 커리큘럼을 만들어줘요.

## CLAUDE.md의 중요성

Claude Code를 효과적으로 사용하려면 **CLAUDE.md** 파일이 핵심이에요. 프로젝트 루트에 이 파일을 만들어두면, Claude Code가 매 세션마다 이 파일을 읽고 프로젝트의 맥락을 이해합니다.

CLAUDE.md에 포함하면 좋은 것들:
- 프로젝트 기술 스택과 구조
- 코딩 컨벤션 (네이밍 규칙, 파일 구조 등)
- 데이터베이스 스키마 요약
- 자주 사용하는 명령어
- 주의사항 (직접 수정하면 안 되는 파일 등)

잘 작성된 CLAUDE.md는 AI와의 협업 품질을 극적으로 향상시킵니다.`,
    bodyEn: `## Claude Code — Where to Start?

Claude Code is a terminal-based AI coding tool built by Anthropic. Unlike editors like VS Code, it operates directly in the terminal, giving it powerful access to all project files.

This guide walks you through building a real fullstack web app with Claude Code, step by step.

## Step 1: Project Initialization

Open your terminal and start a new project.

\`\`\`bash
mkdir my-app && cd my-app
claude
\`\`\`

Once Claude Code is running, give it natural language instructions:

> "Create a fullstack web app using Next.js 15 + TypeScript + Tailwind CSS + Supabase. Use App Router, with user authentication and CRUD functionality for a todo management app."

Claude Code generates the project structure, installs packages, and writes the initial code.

## Step 2: Database Design

You could create tables in the Supabase dashboard, but letting Claude Code handle it is faster.

> "Create a todos table in Supabase with id(uuid), title(text), completed(boolean), user_id(uuid), created_at(timestamp) columns, and set up RLS policies."

Claude Code generates SQL migration files and writes Row Level Security policies.

## Step 3: API and Server Actions

Next.js 15 lets you implement server-side logic using Server Actions.

> "Implement add, update, delete, and list functionality as Server Actions. Use the Supabase client and ensure only authenticated users can access them."

Claude Code creates type-safe Server Action functions in the \`server/actions/\` directory.

## Step 4: UI Components

> "Create a todo list page. Show todos as cards with checkboxes for completion and delete buttons. Design it cleanly with Tailwind CSS."

React components are generated and connected to Server Actions.

## Step 5: Authentication

> "Add email login/signup with Supabase Auth. Check auth in middleware and redirect unauthenticated users to the login page."

Auth pages, middleware, and protected routes are generated.

## Step 6: Deployment

> "Configure for Vercel deployment. Show me the list of required environment variables."

\`vercel.json\` configuration and environment variable lists are generated.

## What to Do After Building

Once you've built the app, what matters is **understanding your code**.

Hidden within Claude Code's generated code are countless patterns and concepts. Understanding the difference between Server and Client Components, how RLS policies work, and the role of middleware is essential for growing as a real developer.

VibeUniv helps with this process. Connect your project and AI analyzes your tech stack, creating a personalized curriculum using your actual code as the textbook.

## The Importance of CLAUDE.md

To use Claude Code effectively, **CLAUDE.md** is key. Create this file in your project root and Claude Code reads it every session to understand your project's context.

Good things to include in CLAUDE.md:
- Project tech stack and structure
- Coding conventions (naming rules, file structure, etc.)
- Database schema summary
- Frequently used commands
- Cautions (files that shouldn't be directly modified, etc.)

A well-written CLAUDE.md dramatically improves AI collaboration quality.`,
  },
  {
    slug: "how-to-learn-ai-generated-code",
    title: "AI가 생성한 코드, 어떻게 학습해야 할까?",
    titleEn: "How Should You Learn AI-Generated Code?",
    description: "AI가 만들어준 코드를 효과적으로 학습하는 5가지 전략. 단순 사용을 넘어 진정한 이해로 나아가는 방법.",
    descriptionEn: "5 strategies for effectively learning AI-generated code. Moving beyond mere usage to true understanding.",
    date: "2026-03-05",
    category: "학습",
    readTime: 6,
    body: `## "작동하는데, 왜 이렇게 작동하는지 모르겠어"

바이브 코딩으로 앱을 만든 대부분의 사람들이 느끼는 감정이에요. AI가 만들어준 코드가 잘 작동하긴 하는데, 한 줄 한 줄이 무슨 역할을 하는지는 모르겠다는 거죠.

이건 자연스러운 거예요. AI가 수천 줄의 코드를 한꺼번에 만들어주니까, 전통적인 "하나씩 배우면서 만들기" 과정이 통째로 건너뛰어진 셈이거든요.

하지만 코드를 이해하지 못한 채로 두면, 결국 벽에 부딪힙니다. 새 기능 추가가 AI에게만 의존하게 되고, 버그를 고치려다 더 큰 버그가 생기고, 보안 문제를 놓치게 되죠.

## 전략 1: 프로젝트 구조부터 파악하기

코드를 한 줄씩 읽으려 하지 마세요. 먼저 **숲을 보세요**. 프로젝트 폴더 구조를 펼쳐보고, 각 폴더가 무슨 역할을 하는지 파악하세요.

\`app/\` 폴더는 페이지들이 있고, \`components/\`는 UI 조각들이 있고, \`server/actions/\`에는 서버 로직이 있고, \`lib/\`에는 유틸리티가 있어요.

**행동 팁:** 프로젝트 루트에서 폴더 구조를 캡처하고, 각 폴더 옆에 한 줄 설명을 적어보세요.

## 전략 2: 데이터 흐름 따라가기

하나의 기능을 골라서, 데이터가 어떻게 흘러가는지 추적해보세요.

예를 들어 "로그인" 기능이라면:
1. 사용자가 폼에 이메일/비밀번호 입력 (클라이언트 컴포넌트)
2. Server Action이 호출됨
3. Supabase Auth API가 호출됨
4. 세션이 생성되고 쿠키에 저장됨
5. 대시보드로 리다이렉트

이렇게 하나의 흐름을 끝까지 따라가면, 여러 파일이 어떻게 연결되는지 이해할 수 있어요.

## 전략 3: 핵심 패턴 3개만 먼저 익히기

모든 걸 한꺼번에 배우려 하지 마세요. 대부분의 웹 앱에서 반복되는 핵심 패턴 3개만 먼저 이해하세요.

**패턴 1: 서버 vs 클라이언트 컴포넌트**
\`'use client'\`가 있으면 브라우저에서 실행, 없으면 서버에서 실행.

**패턴 2: 데이터 CRUD**
Create(생성), Read(조회), Update(수정), Delete(삭제) — 대부분의 기능은 이 네 가지의 조합.

**패턴 3: 인증과 권한**
"이 사용자가 이 데이터에 접근할 수 있는가?" — 모든 보안의 기본.

## 전략 4: AI 튜터에게 질문하기

코드를 읽다가 이해가 안 되는 부분이 있으면, AI에게 물어보세요. 하지만 "이 코드 설명해줘"보다는 구체적으로 질문하는 게 효과적이에요.

좋은 질문 예시:
- "이 useEffect의 의존성 배열이 왜 비어있어?"
- "여기서 RLS 정책 대신 Server Action에서 권한 체크를 하면 안 될까?"
- "이 컴포넌트를 클라이언트 컴포넌트로 만든 이유가 뭐야?"

## 전략 5: 작은 수정부터 직접 해보기

이해한 내용을 확인하는 가장 좋은 방법은 **직접 코드를 수정해보는 것**이에요.

작은 것부터 시작하세요.
- 버튼 텍스트 변경
- 새로운 필드 추가
- 정렬 순서 변경
- 간단한 유효성 검사 추가

직접 수정하고, 결과를 확인하고, 깨지면 왜 깨졌는지 파악하는 과정이 가장 효과적인 학습입니다.

## VibeUniv가 이 과정을 도와드려요

이 5가지 전략을 체계적으로 실천할 수 있도록, VibeUniv는 여러분의 실제 프로젝트를 분석해서 맞춤 학습 커리큘럼을 만들어줍니다. AI 튜터가 여러분의 코드를 바탕으로 질문에 답하고, 퀴즈와 챌린지로 이해를 확인할 수 있어요.`,
    bodyEn: `## "It Works, But I Don't Know Why"

This is what most people who've built apps with vibe coding feel. The AI-generated code works fine, but they don't know what each line does.

This is natural. Since AI generates thousands of lines at once, the traditional "learn as you build" process gets entirely skipped.

But leaving code you don't understand eventually hits a wall. New features depend solely on AI, fixing bugs creates bigger bugs, and security issues get missed.

## Strategy 1: Understand Project Structure First

Don't try to read code line by line. First, **see the forest**. Expand the project folder structure and understand each folder's role.

The \`app/\` folder contains pages, \`components/\` has UI pieces, \`server/actions/\` has server logic, and \`lib/\` has utilities.

**Action tip:** Capture the folder structure from the project root and write a one-line description next to each folder.

## Strategy 2: Follow the Data Flow

Pick one feature and trace how data flows through it.

For example, "login":
1. User enters email/password in form (client component)
2. Server Action is called
3. Supabase Auth API is called
4. Session is created and stored in cookie
5. Redirect to dashboard

Following one flow end-to-end helps you understand how multiple files connect.

## Strategy 3: Master Just 3 Core Patterns First

Don't try to learn everything at once. First understand 3 core patterns that repeat in most web apps.

**Pattern 1: Server vs Client Components**
Has \`'use client'\` = runs in browser. Doesn't = runs on server.

**Pattern 2: Data CRUD**
Create, Read, Update, Delete — most features are combinations of these four.

**Pattern 3: Auth and Permissions**
"Can this user access this data?" — the foundation of all security.

## Strategy 4: Ask an AI Tutor

When you don't understand something while reading code, ask AI. But asking specifically is more effective than "explain this code."

Good question examples:
- "Why is this useEffect's dependency array empty?"
- "Could I check permissions in the Server Action instead of RLS?"
- "Why was this component made a client component?"

## Strategy 5: Start with Small Modifications

The best way to confirm understanding is **modifying code yourself**.

Start small:
- Change button text
- Add a new field
- Change sort order
- Add simple validation

Modifying, checking results, and understanding why something broke is the most effective learning.

## VibeUniv Helps With This Process

To systematically practice these 5 strategies, VibeUniv analyzes your actual project and creates personalized learning curricula. An AI tutor answers questions based on your code, with quizzes and challenges to verify understanding.`,
  },
  {
    slug: "what-is-mcp",
    title: "MCP(Model Context Protocol)란? AI 도구 연동의 표준",
    titleEn: "What is MCP (Model Context Protocol)? The Standard for AI Tool Integration",
    description: "MCP의 개념, 작동 방식, 그리고 VibeUniv가 MCP를 활용해 AI 코딩 도구와 연동하는 방법을 알아봅니다.",
    descriptionEn: "Learn about MCP concepts, how it works, and how VibeUniv uses MCP to integrate with AI coding tools.",
    date: "2026-03-06",
    category: "기술",
    readTime: 7,
    body: `## AI 도구마다 다른 연동 방식, 이제 표준이 생겼어요

2025년 이전에는 각 AI 도구가 외부 서비스와 연동하는 방식이 제각각이었어요. Claude Code는 자체 플러그인, Cursor는 또 다른 방식, GPT는 Function Calling... 서비스 개발자 입장에서는 같은 기능을 여러 번 구현해야 했죠.

**MCP(Model Context Protocol)**는 이 문제를 해결하기 위해 Anthropic이 만든 오픈 표준이에요. USB-C가 모든 기기의 충전 포트를 하나로 통일한 것처럼, MCP는 AI 도구와 서비스의 연동 방식을 하나로 통일합니다.

## MCP의 핵심 개념

### MCP 서버
외부 서비스(VibeUniv, GitHub, Slack 등)가 AI 도구에게 기능을 제공하는 프로그램이에요. "이런 도구(Tool)들을 사용할 수 있어요"라고 AI에게 알려주는 역할을 합니다.

### MCP 호스트
AI 도구(Claude Code, Cursor 등)가 MCP 서버와 통신하는 프로그램이에요. 사용자의 요청을 받아서 적절한 MCP 서버의 도구를 호출합니다.

### 도구 (Tools)
MCP 서버가 제공하는 기능 단위예요. 예를 들어 VibeUniv MCP 서버는 12개의 도구를 제공합니다.

| 도구 | 기능 |
|------|------|
| vibeuniv_sync_project | 프로젝트 파일 연동 |
| vibeuniv_analyze | 기술 스택 분석 지침 생성 |
| vibeuniv_submit_tech_stacks | 분석 결과 서버 저장 |
| vibeuniv_generate_curriculum | 학습 커리큘럼 구조 생성 |
| vibeuniv_submit_module | 모듈별 콘텐츠 제출 |
| vibeuniv_ask_tutor | AI 튜터 질문 |

## MCP의 작동 흐름

1. 사용자가 Claude Code에서 "내 프로젝트 분석해줘"라고 말합니다
2. Claude Code가 VibeUniv MCP 서버의 \`vibeuniv_sync_project\` 도구를 호출합니다
3. MCP 서버가 프로젝트 파일을 VibeUniv API에 전송합니다
4. 결과가 Claude Code에 표시됩니다

사용자는 별도의 API 호출이나 복잡한 설정 없이, 자연어로 VibeUniv의 모든 기능을 사용할 수 있어요.

## Local-First 아키텍처

VibeUniv MCP 서버의 특별한 점은 **Local-First 아키텍처**예요. 기존 방식에서는 서버에서 LLM을 호출해서 분석했지만, VibeUniv는 사용자의 로컬 AI(Claude Code 등)가 직접 분석합니다.

이 방식의 장점:
- **서버 비용 99.5% 절감** — LLM 호출이 서버에서 발생하지 않음
- **프라이버시** — 코드가 VibeUniv 서버의 LLM을 거치지 않음
- **속도** — 로컬 AI가 이미 컨텍스트를 가지고 있으니 더 빠름

\`vibeuniv_analyze\` 도구를 예로 들면, 이 도구는 "분석 지침"만 반환하고 실제 분석은 로컬 AI가 수행해요. 결과는 \`vibeuniv_submit_tech_stacks\`로 서버에 저장합니다.

## MCP 설정 방법

Claude Code에서 VibeUniv MCP를 사용하려면 한 줄이면 충분해요.

\`\`\`bash
claude mcp add vibeuniv -- npx -y @vibeuniv/mcp-server
\`\`\`

Cursor나 Windsurf 등 다른 도구에서는 설정 파일에 MCP 서버 정보를 추가합니다.

\`\`\`json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

## Per-Module Submission 패턴

VibeUniv의 최신 MCP 서버(v0.3.12)는 **Per-Module Submission** 패턴을 사용해요.

기존에는 전체 커리큘럼(10-15개 모듈)을 한 번에 서버로 전송했는데, 데이터가 너무 커서 AI가 내용을 잘라내는 문제가 있었어요. 지금은 모듈 하나씩 생성하고 검증한 후 개별 전송합니다.

이 패턴 덕분에 각 모듈의 콘텐츠 품질을 개별 검증할 수 있게 되었고, 대규모 데이터 전송의 잘림 문제도 해결되었습니다.

## MCP의 미래

MCP는 빠르게 AI 도구 생태계의 표준으로 자리잡고 있어요. 개발 도구뿐만 아니라, CRM, 프로젝트 관리, 데이터 분석 등 다양한 분야에서 MCP 서버가 만들어지고 있습니다.

AI 도구를 활용하는 바이브 코더에게 MCP는 필수 개념이에요. VibeUniv를 MCP로 연동하면, 프로젝트 분석부터 학습 커리큘럼 생성까지 자연어로 모든 것을 할 수 있답니다.`,
    bodyEn: `## Different Integration Methods for Each AI Tool — Now There's a Standard

Before 2025, each AI tool had its own way of integrating with external services. Claude Code had its own plugins, Cursor had another approach, GPT had Function Calling... Service developers had to implement the same functionality multiple times.

**MCP (Model Context Protocol)** is an open standard created by Anthropic to solve this problem. Like USB-C unified charging ports across all devices, MCP unifies how AI tools and services integrate.

## Core Concepts of MCP

### MCP Server
A program where external services (VibeUniv, GitHub, Slack, etc.) provide functionality to AI tools. It tells AI "these Tools are available for use."

### MCP Host
A program where AI tools (Claude Code, Cursor, etc.) communicate with MCP servers. It receives user requests and calls appropriate MCP server tools.

### Tools
Functional units provided by MCP servers. For example, the VibeUniv MCP server provides 12 tools.

| Tool | Function |
|------|----------|
| vibeuniv_sync_project | Project file sync |
| vibeuniv_analyze | Generate tech stack analysis instructions |
| vibeuniv_submit_tech_stacks | Save analysis results to server |
| vibeuniv_generate_curriculum | Generate learning curriculum structure |
| vibeuniv_submit_module | Submit per-module content |
| vibeuniv_ask_tutor | Ask AI tutor |

## How MCP Works

1. User says "analyze my project" in Claude Code
2. Claude Code calls the VibeUniv MCP server's \`vibeuniv_sync_project\` tool
3. MCP server sends project files to the VibeUniv API
4. Results are displayed in Claude Code

Users can use all VibeUniv features through natural language, without separate API calls or complex configuration.

## Local-First Architecture

What makes VibeUniv's MCP server special is its **Local-First Architecture**. Traditional approaches had the server calling LLMs for analysis, but VibeUniv has the user's local AI (Claude Code, etc.) do the analysis directly.

Benefits:
- **99.5% server cost reduction** — LLM calls don't happen on the server
- **Privacy** — code doesn't go through VibeUniv server's LLM
- **Speed** — local AI already has the context, so it's faster

Taking \`vibeuniv_analyze\` as an example, this tool only returns "analysis instructions" while actual analysis is performed by local AI. Results are saved to the server via \`vibeuniv_submit_tech_stacks\`.

## How to Set Up MCP

One line is enough to use VibeUniv MCP in Claude Code:

\`\`\`bash
claude mcp add vibeuniv -- npx -y @vibeuniv/mcp-server
\`\`\`

For other tools like Cursor or Windsurf, add MCP server info to the config file.

\`\`\`json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

## Per-Module Submission Pattern

VibeUniv's latest MCP server (v0.3.12) uses the **Per-Module Submission** pattern.

Previously, the entire curriculum (10-15 modules) was sent to the server at once, but the data was too large and AI truncated content. Now, modules are generated, validated, and submitted individually.

This pattern enables individual quality validation for each module's content and solves the truncation problem with large data transfers.

## The Future of MCP

MCP is rapidly establishing itself as the standard for the AI tool ecosystem. Beyond development tools, MCP servers are being created for CRM, project management, data analysis, and more.

For vibe coders using AI tools, MCP is an essential concept. Connect VibeUniv via MCP, and you can do everything from project analysis to curriculum generation through natural language.`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => b.date.localeCompare(a.date));
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(slug);
  if (!current) return [];

  const others = blogPosts.filter((p) => p.slug !== slug);

  // Prioritize same category, then by date
  const sameCategory = others.filter((p) => p.category === current.category);
  const diffCategory = others.filter((p) => p.category !== current.category);

  return [...sameCategory, ...diffCategory]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
