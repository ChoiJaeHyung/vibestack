/**
 * KB 시드 데이터 삽입 (마이그레이션 SQL INSERT 대체)
 * Supabase REST API를 통해 5개 기술의 시드 데이터를 삽입합니다.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Import seed data from existing TypeScript files (dynamic import)
const seedData = [
  {
    technology_name: 'Next.js',
    technology_name_normalized: 'next.js',
    version: '15',
    source: 'seed',
    generation_status: 'ready',
    generated_at: new Date().toISOString(),
    concepts: [
      {"concept_key":"app-router","concept_name":"App Router 이해하기","key_points":["app/ 디렉토리의 파일 시스템 기반 라우팅","page.tsx가 라우트 엔드포인트, layout.tsx가 공유 레이아웃","loading.tsx, error.tsx, not-found.tsx 같은 특수 파일 컨벤션","폴더명이 URL 경로가 됨 (app/dashboard/page.tsx → /dashboard)"],"common_quiz_topics":["파일 컨벤션 (page.tsx vs layout.tsx 역할)","동적 라우팅 [id] 문법","Route Groups (괄호 폴더)의 용도"],"prerequisite_concepts":["react-components"],"tags":["routing","file-convention","page","layout"]},
      {"concept_key":"server-components","concept_name":"서버 컴포넌트 vs 클라이언트 컴포넌트","key_points":["Next.js 15에서 모든 컴포넌트는 기본 서버 컴포넌트","'use client' 지시어로 클라이언트 컴포넌트 선언","서버 컴포넌트: DB 접근, API 키 안전, 번들 크기 0","클라이언트 컴포넌트: useState, useEffect, 이벤트 핸들러 필요 시","서버 → 클라이언트 데이터 전달은 props로 (직렬화 가능한 값만)"],"common_quiz_topics":["'use client'가 필요한 경우 vs 불필요한 경우","서버 컴포넌트에서 불가능한 것들","클라이언트/서버 경계에서 props 전달 규칙"],"prerequisite_concepts":["react-components","app-router"],"tags":["server-component","client-component","use-client","RSC"]},
      {"concept_key":"server-actions","concept_name":"Server Actions으로 폼 처리하기","key_points":["'use server' 지시어로 서버 액션 정의","클라이언트에서 직접 서버 함수를 호출하는 RPC 패턴","form action 속성에 바로 연결 가능","데이터 변경(mutation) 후 revalidatePath/revalidateTag로 캐시 갱신"],"common_quiz_topics":["'use server' vs 'use client' 차이","Server Action에서 인증 처리 방법","Server Action vs API Route 선택 기준"],"prerequisite_concepts":["server-components"],"tags":["server-action","use-server","form","mutation"]},
      {"concept_key":"api-routes","concept_name":"API Route 만들기","key_points":["app/api/ 디렉토리의 route.ts 파일로 API 엔드포인트 생성","GET, POST, PUT, DELETE 등 HTTP 메서드별 함수 export","NextRequest, NextResponse 객체 사용","외부 서비스(webhook, MCP 등)와의 통합 지점"],"common_quiz_topics":["route.ts에서 지원하는 HTTP 메서드","동적 API 라우트 [id]/route.ts 패턴","미들웨어와 API Route의 관계"],"prerequisite_concepts":["app-router"],"tags":["api","route","endpoint","REST"]},
      {"concept_key":"middleware","concept_name":"미들웨어로 요청 제어하기","key_points":["프로젝트 루트의 middleware.ts에서 모든 요청 인터셉트","인증 체크, 리다이렉트, 헤더 조작 등에 활용","matcher 설정으로 적용 경로 제한","Edge Runtime에서 실행 (Node.js API 일부 제한)"],"common_quiz_topics":["미들웨어가 실행되는 시점","미들웨어에서 할 수 있는 것과 없는 것","matcher 패턴 작성법"],"prerequisite_concepts":["app-router","api-routes"],"tags":["middleware","auth","redirect","edge"]}
    ],
  },
  {
    technology_name: 'React',
    technology_name_normalized: 'react',
    version: '19',
    source: 'seed',
    generation_status: 'ready',
    generated_at: new Date().toISOString(),
    concepts: [
      {"concept_key":"react-components","concept_name":"컴포넌트 기초 이해하기","key_points":["컴포넌트는 UI를 독립적으로 재사용 가능한 단위로 나눈 것","함수형 컴포넌트가 표준 (class 컴포넌트는 레거시)","JSX로 HTML과 유사한 문법으로 UI 작성","props로 부모 → 자식 데이터 전달","컴포넌트 합성(composition)으로 복잡한 UI 구성"],"common_quiz_topics":["JSX에서 JavaScript 표현식 사용법 (중괄호)","props의 단방향 데이터 흐름","컴포넌트 네이밍 규칙 (PascalCase)"],"prerequisite_concepts":[],"tags":["component","jsx","props","composition"]},
      {"concept_key":"hooks-state","concept_name":"useState로 상태 관리하기","key_points":["useState는 컴포넌트에 변경 가능한 상태를 추가하는 Hook","const [value, setValue] = useState(초기값) 패턴","상태가 변경되면 컴포넌트가 자동으로 리렌더링","상태 업데이트는 비동기 (배치 처리됨)","객체/배열 상태는 불변성 유지 필요 (스프레드 연산자)"],"common_quiz_topics":["상태 변경이 즉시 반영되지 않는 이유","불변성을 유지해야 하는 이유","함수형 업데이트 (prev => prev + 1) 패턴"],"prerequisite_concepts":["react-components"],"tags":["useState","state","hook","rerender"]},
      {"concept_key":"hooks-effect","concept_name":"useEffect로 사이드 이펙트 처리하기","key_points":["useEffect는 컴포넌트 외부와 상호작용하는 코드를 실행","API 호출, 이벤트 리스너 등록, 타이머 설정 등에 사용","의존성 배열로 실행 시점 제어 ([], [dep1, dep2])","클린업 함수로 이펙트 정리 (return () => { ... })","빈 의존성 배열 [] = 마운트 시 1회만 실행"],"common_quiz_topics":["의존성 배열이 비어있을 때 vs 없을 때 차이","클린업 함수가 필요한 경우","무한 루프가 발생하는 실수 패턴"],"prerequisite_concepts":["hooks-state"],"tags":["useEffect","side-effect","lifecycle","cleanup"]},
      {"concept_key":"conditional-rendering","concept_name":"조건부 렌더링 패턴","key_points":["삼항 연산자로 조건부 UI 표시 (condition ? A : B)","논리 AND 연산자로 조건부 표시 (condition && <Component />)","early return으로 로딩/에러 상태 처리","리스트 렌더링에서 key prop의 중요성"],"common_quiz_topics":["key prop이 필요한 이유와 올바른 사용법","falsy 값 (0, '') 렌더링 주의사항","조건부 렌더링 vs CSS display:none 차이"],"prerequisite_concepts":["react-components"],"tags":["conditional","ternary","key","list"]},
      {"concept_key":"event-handling","concept_name":"이벤트 처리와 폼 다루기","key_points":["onClick, onChange, onSubmit 등 camelCase 이벤트 핸들러","이벤트 핸들러에 함수 전달 (함수 호출이 아닌 함수 참조)","e.preventDefault()로 기본 동작 방지 (폼 제출 등)","제어 컴포넌트(controlled component)로 폼 입력 관리"],"common_quiz_topics":["onClick={fn} vs onClick={fn()} 차이","제어 컴포넌트 vs 비제어 컴포넌트","이벤트 버블링과 stopPropagation"],"prerequisite_concepts":["hooks-state"],"tags":["event","form","controlled","handler"]},
      {"concept_key":"react-context","concept_name":"Context로 전역 상태 공유하기","key_points":["createContext + useContext로 prop drilling 없이 데이터 공유","Provider 컴포넌트로 하위 트리에 값 제공","테마, 인증 정보, 언어 설정 등에 주로 사용","Context 값이 변경되면 모든 소비 컴포넌트가 리렌더링"],"common_quiz_topics":["Context vs props 사용 기준","Context 리렌더링 성능 이슈와 해결법","여러 Context를 조합하는 패턴"],"prerequisite_concepts":["hooks-state","react-components"],"tags":["context","provider","global-state","useContext"]}
    ],
  },
  {
    technology_name: 'TypeScript',
    technology_name_normalized: 'typescript',
    version: '5',
    source: 'seed',
    generation_status: 'ready',
    generated_at: new Date().toISOString(),
    concepts: [
      {"concept_key":"type-basics","concept_name":"타입 기초: 왜 타입이 필요한가","key_points":["타입은 코드 실행 전에 버그를 잡아주는 안전장치","string, number, boolean, null, undefined 기본 타입","배열 타입 (string[], number[]) 과 객체 타입","type과 interface로 커스텀 타입 정의","타입 추론으로 명시적 타입 선언 줄이기"],"common_quiz_topics":["type vs interface 차이점","타입 추론이 작동하는 경우","any를 피해야 하는 이유"],"prerequisite_concepts":[],"tags":["type","interface","inference","basic"]},
      {"concept_key":"generics","concept_name":"제네릭으로 유연한 타입 만들기","key_points":["제네릭은 타입을 매개변수처럼 전달하는 패턴","Array<T>, Promise<T>, Record<K, V> 등 내장 제네릭","함수 제네릭: function identity<T>(arg: T): T","제네릭 제약 (extends)으로 타입 범위 제한"],"common_quiz_topics":["제네릭이 any보다 나은 이유","제네릭 제약 (extends) 사용법","실제 프로젝트에서 제네릭을 사용하는 경우"],"prerequisite_concepts":["type-basics"],"tags":["generic","type-parameter","extends","constraint"]},
      {"concept_key":"union-narrowing","concept_name":"유니온 타입과 타입 내로잉","key_points":["유니온 타입 (string | number)으로 여러 타입 허용","타입 가드 (typeof, in, instanceof)로 타입 좁히기","판별 유니온 (discriminated union)으로 안전한 분기","Optional chaining (?.) 과 nullish coalescing (??)로 null 안전 처리"],"common_quiz_topics":["typeof로 타입 가드하는 패턴","판별 유니온의 type 필드 활용","optional vs nullable 차이"],"prerequisite_concepts":["type-basics"],"tags":["union","narrowing","type-guard","optional"]},
      {"concept_key":"utility-types","concept_name":"유틸리티 타입 활용하기","key_points":["Partial<T>: 모든 프로퍼티를 선택적으로","Pick<T, K>: 특정 프로퍼티만 선택","Omit<T, K>: 특정 프로퍼티 제외","Record<K, V>: 키-값 매핑 타입","ReturnType<T>, Parameters<T>: 함수 타입에서 추출"],"common_quiz_topics":["Partial vs Required 차이","Pick vs Omit 사용 기준","실제 API 응답 타입에 유틸리티 타입 적용"],"prerequisite_concepts":["generics"],"tags":["utility","Partial","Pick","Omit","Record"]},
      {"concept_key":"async-types","concept_name":"비동기 코드의 타입 처리","key_points":["async 함수의 반환 타입은 자동으로 Promise<T>","API 응답 타입 정의로 런타임 에러 사전 방지","try/catch에서 error 타입 처리 (unknown → type guard)","Awaited<T> 유틸리티로 Promise 내부 타입 추출"],"common_quiz_topics":["Promise<T> 타입 작성법","catch 블록에서 error 타입 다루기","async/await vs .then() 타입 차이"],"prerequisite_concepts":["type-basics","generics"],"tags":["async","Promise","await","error-handling"]}
    ],
  },
  {
    technology_name: 'Supabase',
    technology_name_normalized: 'supabase',
    version: '2',
    source: 'seed',
    generation_status: 'ready',
    generated_at: new Date().toISOString(),
    concepts: [
      {"concept_key":"supabase-client","concept_name":"Supabase 클라이언트 설정과 사용","key_points":["서버용(createClient)과 클라이언트용(createBrowserClient) 분리","NEXT_PUBLIC_SUPABASE_URL과 ANON_KEY로 초기화","서비스 롤 키는 서버에서만 사용 (관리자 권한)","미들웨어에서 세션 갱신 처리"],"common_quiz_topics":["서버 클라이언트 vs 브라우저 클라이언트 차이","ANON_KEY vs SERVICE_ROLE_KEY 권한 차이","미들웨어에서 세션을 갱신하는 이유"],"prerequisite_concepts":[],"tags":["client","setup","anon-key","service-role"]},
      {"concept_key":"supabase-auth","concept_name":"Supabase Auth로 인증 구현하기","key_points":["이메일/비밀번호, OAuth, Magic Link 등 다양한 인증 방식","signUp, signInWithPassword, signOut 기본 메서드","getUser()로 현재 로그인 사용자 확인","세션은 쿠키 기반으로 자동 관리됨","미들웨어에서 보호된 라우트 접근 제어"],"common_quiz_topics":["getUser() vs getSession() 차이","인증 상태에 따른 리다이렉트 처리","RLS와 Auth의 관계"],"prerequisite_concepts":["supabase-client"],"tags":["auth","session","login","signup","middleware"]},
      {"concept_key":"supabase-queries","concept_name":"데이터 조회와 변경 (CRUD)","key_points":["select(), insert(), update(), delete()로 CRUD 작업","eq(), neq(), gt(), lt() 등 필터 메서드 체이닝","single()로 단일 행 반환, order()로 정렬","관계형 쿼리: select('*, profiles(*)') 로 JOIN 처리","upsert()로 INSERT OR UPDATE 한 번에 처리"],"common_quiz_topics":["select에서 관계형 데이터 가져오기","에러 처리 패턴 (data, error 구조분해)","필터 체이닝 순서와 동작"],"prerequisite_concepts":["supabase-client"],"tags":["query","select","insert","update","delete","filter"]},
      {"concept_key":"supabase-rls","concept_name":"Row Level Security (RLS) 이해하기","key_points":["RLS는 데이터베이스 레벨에서 행 단위 접근 제어","정책(policy)으로 SELECT, INSERT, UPDATE, DELETE별 규칙 정의","auth.uid()로 현재 로그인 사용자 ID 참조","RLS가 활성화되면 정책 없이는 데이터 접근 불가","서비스 롤 키는 RLS를 우회함 (관리자용)"],"common_quiz_topics":["RLS가 없으면 생기는 보안 문제","auth.uid() = user_id 패턴의 의미","서비스 롤 키가 RLS를 우회하는 이유"],"prerequisite_concepts":["supabase-auth","supabase-queries"],"tags":["RLS","policy","security","auth.uid"]},
      {"concept_key":"supabase-storage","concept_name":"Supabase Storage로 파일 관리하기","key_points":["버킷(bucket)으로 파일을 그룹화하여 관리","upload(), download(), getPublicUrl()로 파일 CRUD","RLS와 동일한 정책 시스템으로 파일 접근 제어","이미지 변환(transform) 기능 내장"],"common_quiz_topics":["Public vs Private 버킷 차이","파일 업로드 시 인증 처리","Storage 정책 작성법"],"prerequisite_concepts":["supabase-client","supabase-rls"],"tags":["storage","bucket","upload","file"]}
    ],
  },
  {
    technology_name: 'Tailwind CSS',
    technology_name_normalized: 'tailwind css',
    version: '4',
    source: 'seed',
    generation_status: 'ready',
    generated_at: new Date().toISOString(),
    concepts: [
      {"concept_key":"utility-first","concept_name":"유틸리티 퍼스트 CSS 이해하기","key_points":["미리 정의된 유틸리티 클래스를 조합하여 스타일링","별도 CSS 파일 없이 HTML/JSX에서 직접 스타일 적용","클래스명이 곧 스타일: flex, p-4, text-lg, bg-zinc-100","디자인 시스템이 내장되어 일관된 간격/색상/크기 사용"],"common_quiz_topics":["유틸리티 퍼스트의 장점과 단점","클래스명으로 스타일 추론하기","인라인 스타일과 유틸리티 클래스의 차이"],"prerequisite_concepts":[],"tags":["utility","class","styling","design-system"]},
      {"concept_key":"responsive-design","concept_name":"반응형 디자인 구현하기","key_points":["sm:, md:, lg:, xl: 접두사로 브레이크포인트별 스타일","모바일 퍼스트 접근: 기본이 모바일, sm부터 데스크톱","flex, grid와 반응형 접두사 조합으로 레이아웃 변환","hidden, block 등으로 요소 표시/숨김 제어"],"common_quiz_topics":["모바일 퍼스트의 의미와 적용법","브레이크포인트 크기와 적용 순서","반응형 그리드 레이아웃 만들기"],"prerequisite_concepts":["utility-first"],"tags":["responsive","breakpoint","mobile-first","sm","md","lg"]},
      {"concept_key":"flexbox-grid","concept_name":"Flexbox와 Grid 레이아웃","key_points":["flex: 1차원 레이아웃 (행 또는 열)","grid: 2차원 레이아웃 (행과 열 동시)","items-center, justify-between 등 정렬 유틸리티","gap-4로 아이템 간 간격 설정","flex-col, grid-cols-3 등 방향과 컬럼 수 지정"],"common_quiz_topics":["flex vs grid 사용 기준","가운데 정렬하는 여러 방법","gap과 padding/margin의 차이"],"prerequisite_concepts":["utility-first"],"tags":["flex","grid","layout","alignment","gap"]},
      {"concept_key":"dark-mode","concept_name":"다크 모드 구현하기","key_points":["dark: 접두사로 다크 모드 스타일 지정","bg-white dark:bg-zinc-900 패턴으로 색상 전환","시스템 설정 기반 또는 수동 토글 방식","Tailwind v4에서 CSS 변수 기반 테마 시스템"],"common_quiz_topics":["dark: 접두사 동작 원리","다크 모드 토글 구현 방법","색상 팔레트 설계 패턴"],"prerequisite_concepts":["utility-first"],"tags":["dark-mode","theme","color","dark:"]},
      {"concept_key":"tailwind-customization","concept_name":"커스터마이징과 확장","key_points":["tailwind.config에서 테마 확장 (colors, spacing, fonts)","커스텀 유틸리티 클래스 추가 (@layer utilities)","플러그인으로 기능 확장 (typography, forms, animate)","CSS 변수를 활용한 동적 테마 값"],"common_quiz_topics":["테마 확장 vs 오버라이드 차이","커스텀 색상 추가 방법","@apply 디렉티브의 용도와 주의점"],"prerequisite_concepts":["utility-first"],"tags":["config","theme","plugin","custom","extend"]}
    ],
  },
];

console.log('Inserting seed data...');

const { data, error } = await supabase
  .from('technology_knowledge')
  .insert(seedData)
  .select('technology_name, technology_name_normalized');

if (error) {
  console.error('Insert failed:', error.message);
  process.exit(1);
}

console.log(`Inserted ${data.length} rows:`);
for (const row of data) {
  console.log(`  ✅ ${row.technology_name} (${row.technology_name_normalized})`);
}
