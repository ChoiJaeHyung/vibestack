import type { TechKnowledge } from "../types";

export const SUPABASE_KNOWLEDGE: TechKnowledge = {
  technology_name: "Supabase",
  version: "2",
  concepts: [
    {
      concept_key: "supabase-client",
      concept_name: "Supabase 클라이언트 설정과 사용",
      key_points: [
        "서버용(createClient)과 클라이언트용(createBrowserClient) 분리",
        "NEXT_PUBLIC_SUPABASE_URL과 ANON_KEY로 초기화",
        "서비스 롤 키는 서버에서만 사용 (관리자 권한)",
        "미들웨어에서 세션 갱신 처리",
      ],
      common_quiz_topics: [
        "서버 클라이언트 vs 브라우저 클라이언트 차이",
        "ANON_KEY vs SERVICE_ROLE_KEY 권한 차이",
        "미들웨어에서 세션을 갱신하는 이유",
      ],
      prerequisite_concepts: [],
      tags: ["client", "setup", "anon-key", "service-role"],
    },
    {
      concept_key: "supabase-auth",
      concept_name: "Supabase Auth로 인증 구현하기",
      key_points: [
        "이메일/비밀번호, OAuth, Magic Link 등 다양한 인증 방식",
        "signUp, signInWithPassword, signOut 기본 메서드",
        "getUser()로 현재 로그인 사용자 확인",
        "세션은 쿠키 기반으로 자동 관리됨",
        "미들웨어에서 보호된 라우트 접근 제어",
      ],
      common_quiz_topics: [
        "getUser() vs getSession() 차이",
        "인증 상태에 따른 리다이렉트 처리",
        "RLS와 Auth의 관계",
      ],
      prerequisite_concepts: ["supabase-client"],
      tags: ["auth", "session", "login", "signup", "middleware"],
    },
    {
      concept_key: "supabase-queries",
      concept_name: "데이터 조회와 변경 (CRUD)",
      key_points: [
        "select(), insert(), update(), delete()로 CRUD 작업",
        "eq(), neq(), gt(), lt() 등 필터 메서드 체이닝",
        "single()로 단일 행 반환, order()로 정렬",
        "관계형 쿼리: select('*, profiles(*)')로 JOIN 처리",
        "upsert()로 INSERT OR UPDATE 한 번에 처리",
      ],
      common_quiz_topics: [
        "select에서 관계형 데이터 가져오기",
        "에러 처리 패턴 (data, error 구조분해)",
        "필터 체이닝 순서와 동작",
      ],
      prerequisite_concepts: ["supabase-client"],
      tags: ["query", "select", "insert", "update", "delete", "filter"],
    },
    {
      concept_key: "supabase-rls",
      concept_name: "Row Level Security (RLS) 이해하기",
      key_points: [
        "RLS는 데이터베이스 레벨에서 행 단위 접근 제어",
        "정책(policy)으로 SELECT, INSERT, UPDATE, DELETE별 규칙 정의",
        "auth.uid()로 현재 로그인 사용자 ID 참조",
        "RLS가 활성화되면 정책 없이는 데이터 접근 불가",
        "서비스 롤 키는 RLS를 우회함 (관리자용)",
      ],
      common_quiz_topics: [
        "RLS가 없으면 생기는 보안 문제",
        "auth.uid() = user_id 패턴의 의미",
        "서비스 롤 키가 RLS를 우회하는 이유",
      ],
      prerequisite_concepts: ["supabase-auth", "supabase-queries"],
      tags: ["RLS", "policy", "security", "auth.uid"],
    },
    {
      concept_key: "supabase-storage",
      concept_name: "Supabase Storage로 파일 관리하기",
      key_points: [
        "버킷(bucket)으로 파일을 그룹화하여 관리",
        "upload(), download(), getPublicUrl()로 파일 CRUD",
        "RLS와 동일한 정책 시스템으로 파일 접근 제어",
        "이미지 변환(transform) 기능 내장",
      ],
      common_quiz_topics: [
        "Public vs Private 버킷 차이",
        "파일 업로드 시 인증 처리",
        "Storage 정책 작성법",
      ],
      prerequisite_concepts: ["supabase-client", "supabase-rls"],
      tags: ["storage", "bucket", "upload", "file"],
    },
  ],
};
