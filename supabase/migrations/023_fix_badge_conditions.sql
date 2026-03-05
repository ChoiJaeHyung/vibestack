-- 023: Fix unreachable badge conditions
-- code_challenger: refactoring_challenges has no UI — badge is unearnable
-- speedster: 10-minute threshold is unrealistic (beginner modules are 15-45 min)

-- Add is_active column (missing from original 011_badges.sql)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Deactivate code_challenger (no UI to earn it)
UPDATE badges SET is_active = false WHERE slug = 'code_challenger';

-- Relax speedster threshold: 10 → 15 minutes (matches beginner minimum)
UPDATE badges SET condition_value = 15 WHERE slug = 'speedster';
