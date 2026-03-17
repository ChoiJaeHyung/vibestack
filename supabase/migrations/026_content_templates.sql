-- 026_content_templates.sql
-- Ontology-Driven Template Engine: content_templates + template_generation_jobs

-- ─── content_templates ──────────────────────────────────────────────────

create table content_templates (
  id uuid primary key default gen_random_uuid(),

  -- Composite key: 어떤 기술의 어떤 개념, 어떤 난이도, 어떤 섹션 타입, 어떤 언어
  technology_name text not null,
  concept_key text not null,
  difficulty text not null
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  section_type text not null
    check (section_type in ('explanation', 'code_example', 'quiz_question', 'challenge', 'reflection')),
  locale text not null default 'ko'
    check (locale in ('ko', 'en')),

  -- 콘텐츠 (기존 ContentSection 타입과 1:1 매핑)
  title text not null,
  body text not null,
  code text,
  quiz_options jsonb,
  quiz_answer int,
  quiz_explanation text,

  -- 메타데이터
  metadata jsonb default '{}'::jsonb,
  source text default 'seed'
    check (source in ('seed', 'auto_generated', 'manual')),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- concept_key당 같은 타입의 같은 제목 중복 방지
  unique(technology_name, concept_key, difficulty, section_type, locale, title)
);

-- Performance indexes
create index idx_ct_lookup
  on content_templates (technology_name, concept_key, difficulty, locale);
create index idx_ct_section_type
  on content_templates (section_type);

-- RLS
alter table content_templates enable row level security;

create policy "authenticated_read" on content_templates
  for select to authenticated using (true);

create policy "service_role_manage" on content_templates
  for all to service_role using (true);

-- Updated_at trigger (reuse existing function if available)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger content_templates_updated_at
  before update on content_templates
  for each row execute function update_updated_at_column();

-- ─── template_generation_jobs ───────────────────────────────────────────

create table template_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  technology_name text not null,
  locale text not null check (locale in ('ko', 'en')),
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'failed')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  error_message text,
  template_count int default 0,
  -- 동시 생성 방지: 같은 기술+locale에 대해 1 row만 허용
  unique(technology_name, locale)
);

-- generating 상태인 job만 잠금 역할 (SELECT FOR UPDATE와 함께 사용)
create index idx_tgj_active
  on template_generation_jobs (technology_name, locale) where status = 'generating';

-- RLS (서비스 역할만 접근)
alter table template_generation_jobs enable row level security;

create policy "service_role_manage_jobs" on template_generation_jobs
  for all to service_role using (true);
