-- 010: Add locale support for multi-language learning content (ko/en)

-- 1. users.locale — user's preferred learning content language
ALTER TABLE public.users
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en'));

-- 2. learning_paths.locale — language of the generated content
ALTER TABLE public.learning_paths
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en'));

-- 3. technology_knowledge.locale — language of KB concepts
ALTER TABLE public.technology_knowledge
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en'));

-- Replace unique constraint on technology_name_normalized with (name_normalized, locale)
ALTER TABLE public.technology_knowledge
  DROP CONSTRAINT IF EXISTS technology_knowledge_technology_name_normalized_key;

ALTER TABLE public.technology_knowledge
  ADD CONSTRAINT technology_knowledge_name_locale_unique
  UNIQUE (technology_name_normalized, locale);
