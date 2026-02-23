-- ============================
-- Admin System Migration
-- ============================

-- 1A. users 테이블 확장: 역할, 밴 관련 컬럼
ALTER TABLE public.users
  ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  ADD COLUMN is_banned BOOLEAN DEFAULT false,
  ADD COLUMN banned_at TIMESTAMPTZ,
  ADD COLUMN ban_reason TEXT;

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_banned ON public.users(is_banned) WHERE is_banned = true;

-- ============================
-- 1B. RLS 헬퍼 함수 (SECURITY DEFINER: users 테이블 RLS 재귀 방지)
-- ============================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin') AND is_banned = false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin' AND is_banned = false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================
-- 1C. 기존 12개 테이블에 어드민 RLS 정책 추가
-- (기존 사용자 정책은 건드리지 않음)
-- ============================

-- SELECT: admin은 모든 테이블 전체 조회 가능
CREATE POLICY "admin_select_users" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_user_api_keys" ON public.user_api_keys FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_user_llm_keys" ON public.user_llm_keys FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_projects" ON public.projects FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_project_files" ON public.project_files FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_tech_stacks" ON public.tech_stacks FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_analysis_jobs" ON public.analysis_jobs FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_learning_paths" ON public.learning_paths FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_learning_modules" ON public.learning_modules FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_learning_progress" ON public.learning_progress FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_ai_conversations" ON public.ai_conversations FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_mcp_sessions" ON public.mcp_sessions FOR SELECT USING (public.is_admin());

-- UPDATE: super_admin만 users 테이블 역할/밴 변경 가능
CREATE POLICY "admin_update_users" ON public.users FOR UPDATE USING (public.is_super_admin());

-- DELETE: admin은 콘텐츠 삭제 가능
CREATE POLICY "admin_delete_projects" ON public.projects FOR DELETE USING (public.is_admin());
CREATE POLICY "admin_delete_learning_paths" ON public.learning_paths FOR DELETE USING (public.is_admin());
CREATE POLICY "admin_delete_learning_modules" ON public.learning_modules FOR DELETE USING (public.is_admin());

-- ============================
-- 1D. 신규 테이블: system_settings
-- ============================

CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('llm_config', 'pricing', 'announcement', 'feature_toggle', 'general')),
  description TEXT,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_system_settings" ON public.system_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_insert_system_settings" ON public.system_settings FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY "admin_update_system_settings" ON public.system_settings FOR UPDATE USING (public.is_super_admin());
CREATE POLICY "admin_delete_system_settings" ON public.system_settings FOR DELETE USING (public.is_super_admin());

-- ============================
-- 1D. 신규 테이블: announcements
-- ============================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'update')),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
-- 활성 공지는 모든 인증 사용자가 읽기 가능
CREATE POLICY "authenticated_select_announcements" ON public.announcements
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
-- admin만 쓰기
CREATE POLICY "admin_insert_announcements" ON public.announcements FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_announcements" ON public.announcements FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_delete_announcements" ON public.announcements FOR DELETE USING (public.is_admin());
-- admin은 비활성 공지도 조회 가능
CREATE POLICY "admin_select_all_announcements" ON public.announcements FOR SELECT USING (public.is_admin());

-- ============================
-- 1D. 신규 테이블: admin_audit_log
-- ============================

CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- admin만 읽기 가능 (INSERT는 service client로 처리)
CREATE POLICY "admin_select_audit_log" ON public.admin_audit_log FOR SELECT USING (public.is_admin());

-- 인덱스
CREATE INDEX idx_system_settings_category ON public.system_settings(category);
CREATE INDEX idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX idx_announcements_active ON public.announcements(is_active, starts_at) WHERE is_active = true;
CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_id, created_at);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action_type, created_at);

-- ============================
-- 1E. 초기 시스템 설정 (기본값)
-- ============================

INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES
  ('free_tier_limits', '{"analysis": 3, "learning": 1, "chat": 20}', 'pricing', 'Free tier usage limits'),
  ('feature_toggles', '{"learning": true, "ai_chat": true, "mcp": true, "projects": true}', 'feature_toggle', 'Feature on/off toggles'),
  ('default_llm_provider', '{"provider": "anthropic", "model": "claude-sonnet-4-20250514"}', 'llm_config', 'Default LLM provider configuration');
