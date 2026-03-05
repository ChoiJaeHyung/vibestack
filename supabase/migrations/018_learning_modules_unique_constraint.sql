-- Add unique constraint on (learning_path_id, module_order) to prevent duplicate modules
-- This supports the upsert pattern in the modules API route
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_modules_path_order
  ON learning_modules (learning_path_id, module_order);
