-- Add ON DELETE CASCADE to ai_conversations.project_id and mcp_sessions.project_id
-- so that deleting a project cleans up related conversations and MCP sessions.

ALTER TABLE public.ai_conversations
  DROP CONSTRAINT IF EXISTS ai_conversations_project_id_fkey,
  ADD CONSTRAINT ai_conversations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.ai_conversations
  DROP CONSTRAINT IF EXISTS ai_conversations_learning_path_id_fkey,
  ADD CONSTRAINT ai_conversations_learning_path_id_fkey
    FOREIGN KEY (learning_path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;

ALTER TABLE public.mcp_sessions
  DROP CONSTRAINT IF EXISTS mcp_sessions_project_id_fkey,
  ADD CONSTRAINT mcp_sessions_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
