-- ============================
-- 1. users 테이블 (Supabase Auth 확장)
-- ============================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  plan_type       TEXT DEFAULT 'free' CHECK (plan_type IN ('free','pro','team')),
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auth 트리거: 새 사용자 가입 시 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================
-- 2. user_api_keys (MCP/CLI/API 인증용)
-- ============================
CREATE TABLE public.user_api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  key_hash    TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,
  name        TEXT DEFAULT 'default',
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 3. user_llm_keys (사용자 LLM API 키, 암호화 저장)
-- ============================
CREATE TABLE public.user_llm_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('anthropic','openai','google','groq','mistral','deepseek','cohere','together','fireworks','xai','openrouter')),
  encrypted_key   TEXT NOT NULL,
  key_iv          TEXT NOT NULL,
  display_hint    TEXT,
  is_valid        BOOLEAN DEFAULT true,
  is_default      BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider, encrypted_key)
);

-- ============================
-- 4. projects
-- ============================
CREATE TABLE public.projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  source_platform TEXT,
  source_channel  TEXT CHECK (source_channel IN ('mcp','api','cli','web_upload')),
  status          TEXT DEFAULT 'created' CHECK (status IN ('created','uploaded','analyzing','analyzed','error')),
  last_synced_at  TIMESTAMPTZ,
  tech_summary    JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 5. project_files
-- ============================
CREATE TABLE public.project_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  file_name    TEXT NOT NULL,
  file_type    TEXT NOT NULL CHECK (file_type IN ('dependency','ai_config','build_config','source_code','other')),
  file_path    TEXT,
  storage_url  TEXT,
  raw_content  TEXT,
  file_size    INTEGER,
  content_hash TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 6. tech_stacks
-- ============================
CREATE TABLE public.tech_stacks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  technology_name  TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('framework','language','database','auth','deploy','styling','testing','build_tool','library','other')),
  subcategory      TEXT,
  version          TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.50,
  detected_from    TEXT[],
  description      TEXT,
  importance       TEXT DEFAULT 'core' CHECK (importance IN ('core','supporting','dev_dependency')),
  relationships    JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, technology_name)
);

-- ============================
-- 7. analysis_jobs
-- ============================
CREATE TABLE public.analysis_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES public.users(id) NOT NULL,
  job_type        TEXT NOT NULL CHECK (job_type IN ('tech_analysis','learning_generation','full_analysis')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  llm_provider    TEXT,
  llm_model       TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cost_usd        DECIMAL(10,6),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 8. learning_paths
-- ============================
CREATE TABLE public.learning_paths (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  difficulty      TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  estimated_hours DECIMAL(5,1),
  total_modules   INTEGER DEFAULT 0,
  llm_provider    TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 9. learning_modules
-- ============================
CREATE TABLE public.learning_modules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  content          JSONB NOT NULL DEFAULT '{}',
  module_order     INTEGER NOT NULL,
  module_type      TEXT CHECK (module_type IN ('concept','practical','quiz','project_walkthrough')),
  estimated_minutes INTEGER,
  tech_stack_id    UUID REFERENCES public.tech_stacks(id),
  prerequisites    UUID[],
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 10. learning_progress
-- ============================
CREATE TABLE public.learning_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  module_id    UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  status       TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','skipped')),
  score        DECIMAL(5,2),
  time_spent   INTEGER,
  attempts     INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- ============================
-- 11. ai_conversations
-- ============================
CREATE TABLE public.ai_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id       UUID REFERENCES public.projects(id),
  learning_path_id UUID REFERENCES public.learning_paths(id),
  title            TEXT,
  messages         JSONB NOT NULL DEFAULT '[]',
  context_type     TEXT CHECK (context_type IN ('tech_analysis','learning','general','project_walkthrough')),
  llm_provider     TEXT,
  total_tokens     INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 12. mcp_sessions
-- ============================
CREATE TABLE public.mcp_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id      UUID REFERENCES public.projects(id),
  client_tool     TEXT NOT NULL,
  client_version  TEXT,
  session_start   TIMESTAMPTZ DEFAULT now(),
  session_end     TIMESTAMPTZ,
  tools_called    JSONB DEFAULT '[]',
  files_synced    INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 인덱스
-- ============================
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_tech_stacks_project_id ON public.tech_stacks(project_id);
CREATE INDEX idx_tech_stacks_category ON public.tech_stacks(category);
CREATE INDEX idx_learning_progress_user ON public.learning_progress(user_id, status);
CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs(status, created_at);
CREATE INDEX idx_mcp_sessions_user ON public.mcp_sessions(user_id, is_active);
CREATE INDEX idx_project_files_hash ON public.project_files(content_hash);
CREATE INDEX idx_user_api_keys_user ON public.user_api_keys(user_id, is_active);

-- ============================
-- RLS (Row Level Security)
-- ============================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_llm_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "users_own_data" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_api_keys" ON public.user_api_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_llm_keys" ON public.user_llm_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_project_files" ON public.project_files FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);
CREATE POLICY "own_tech_stacks" ON public.tech_stacks FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);
CREATE POLICY "own_analysis_jobs" ON public.analysis_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_learning_paths" ON public.learning_paths FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_learning_modules" ON public.learning_modules FOR ALL USING (
  learning_path_id IN (SELECT id FROM public.learning_paths WHERE user_id = auth.uid())
);
CREATE POLICY "own_learning_progress" ON public.learning_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_ai_conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_mcp_sessions" ON public.mcp_sessions FOR ALL USING (auth.uid() = user_id);
