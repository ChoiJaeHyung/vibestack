-- 024: Fix learning_modules.tech_stack_id FK to allow project deletion
-- Problem: tech_stack_id REFERENCES tech_stacks(id) with default RESTRICT
--          prevents project deletion (CASCADE deletes tech_stacks → blocked by learning_modules FK)
-- Fix: Change to ON DELETE SET NULL (module keeps existing, tech_stack ref becomes null)

ALTER TABLE learning_modules
  DROP CONSTRAINT IF EXISTS learning_modules_tech_stack_id_fkey,
  ADD CONSTRAINT learning_modules_tech_stack_id_fkey
    FOREIGN KEY (tech_stack_id) REFERENCES tech_stacks(id) ON DELETE SET NULL;
