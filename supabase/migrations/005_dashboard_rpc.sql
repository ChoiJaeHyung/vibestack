-- Migration: 005_dashboard_rpc
-- Description: Single RPC function that replaces ~16 individual queries
--              from getDashboardStats() + getUsageData() server actions.

CREATE OR REPLACE FUNCTION public.get_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _start_of_month timestamptz;
  -- user info
  _user_email text;
  _user_plan_type text;
  _user_role text;
  _user_is_banned boolean;
  -- stats
  _total_projects bigint;
  _monthly_chats bigint;
  _unique_technologies bigint;
  _total_modules bigint;
  _completed_modules bigint;
  _learning_percentage int;
  -- usage
  _monthly_learning_paths bigint;
  -- aggregated JSON
  _recent_projects json;
  _tech_distribution json;
  _current_learning json;
  -- helpers
  _active_path_ids uuid[];
  _first_active_path_id uuid;
BEGIN
  -- Bail out early if not authenticated
  IF _uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Start of current month (UTC)
  _start_of_month := date_trunc('month', now());

  -- ── 1. User info ──────────────────────────────────────────────────
  SELECT email, plan_type::text, role::text, is_banned
  INTO _user_email, _user_plan_type, _user_role, _user_is_banned
  FROM users
  WHERE id = _uid;

  IF _user_email IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- ── 2. Total projects ─────────────────────────────────────────────
  SELECT count(*) INTO _total_projects
  FROM projects
  WHERE user_id = _uid;

  -- ── 3. Monthly AI conversations ───────────────────────────────────
  SELECT count(*) INTO _monthly_chats
  FROM ai_conversations
  WHERE user_id = _uid
    AND created_at >= _start_of_month;

  -- ── 4. Recent projects (top 5 by updated_at DESC) ─────────────────
  SELECT coalesce(
    json_agg(
      json_build_object(
        'id', rp.id,
        'name', rp.name,
        'status', rp.status,
        'source_platform', rp.source_platform,
        'tech_summary', rp.tech_summary,
        'updated_at', rp.updated_at
      )
    ),
    '[]'::json
  )
  INTO _recent_projects
  FROM (
    SELECT id, name, status, source_platform, tech_summary, updated_at
    FROM projects
    WHERE user_id = _uid
    ORDER BY updated_at DESC
    LIMIT 5
  ) rp;

  -- ── 5. Unique technologies count (all user's projects) ────────────
  SELECT count(*) INTO _unique_technologies
  FROM tech_stacks ts
  JOIN projects p ON p.id = ts.project_id
  WHERE p.user_id = _uid;

  -- ── 6. Tech distribution by category ──────────────────────────────
  SELECT coalesce(
    json_agg(
      json_build_object('category', td.category, 'count', td.cnt)
    ),
    '[]'::json
  )
  INTO _tech_distribution
  FROM (
    SELECT ts.category::text AS category, count(*) AS cnt
    FROM tech_stacks ts
    JOIN projects p ON p.id = ts.project_id
    WHERE p.user_id = _uid
    GROUP BY ts.category
  ) td;

  -- ── 7. Active learning paths ──────────────────────────────────────
  SELECT array_agg(id ORDER BY created_at ASC)
  INTO _active_path_ids
  FROM learning_paths
  WHERE user_id = _uid
    AND status = 'active';

  -- ── 8. Learning progress + current learning ───────────────────────
  IF _active_path_ids IS NOT NULL AND array_length(_active_path_ids, 1) > 0 THEN
    _first_active_path_id := _active_path_ids[1];

    -- Total modules from active learning paths
    SELECT coalesce(sum(total_modules), 0) INTO _total_modules
    FROM learning_paths
    WHERE id = ANY(_active_path_ids);

    -- Completed modules across active learning paths
    SELECT count(*) INTO _completed_modules
    FROM learning_progress lp
    JOIN learning_modules lm ON lm.id = lp.module_id
    WHERE lp.user_id = _uid
      AND lm.learning_path_id = ANY(_active_path_ids)
      AND lp.status = 'completed';

    -- Current learning: prefer in_progress module
    SELECT json_build_object(
      'moduleId', lm.id,
      'moduleTitle', lm.title,
      'pathId', lpath.id,
      'pathTitle', lpath.title
    )
    INTO _current_learning
    FROM learning_progress lp
    JOIN learning_modules lm ON lm.id = lp.module_id
    JOIN learning_paths lpath ON lpath.id = lm.learning_path_id
    WHERE lp.user_id = _uid
      AND lp.status = 'in_progress'
      AND lm.learning_path_id = ANY(_active_path_ids)
    LIMIT 1;

    -- Fallback: first module (by module_order) of the first active path
    IF _current_learning IS NULL THEN
      SELECT json_build_object(
        'moduleId', lm.id,
        'moduleTitle', lm.title,
        'pathId', lpath.id,
        'pathTitle', lpath.title
      )
      INTO _current_learning
      FROM learning_modules lm
      JOIN learning_paths lpath ON lpath.id = lm.learning_path_id
      WHERE lm.learning_path_id = _first_active_path_id
      ORDER BY lm.module_order ASC
      LIMIT 1;
    END IF;
  ELSE
    _total_modules := 0;
    _completed_modules := 0;
    _current_learning := NULL;
  END IF;

  -- Learning percentage
  _learning_percentage := CASE
    WHEN _total_modules > 0
      THEN round((_completed_modules::numeric / _total_modules) * 100)
    ELSE 0
  END;

  -- ── 9. Monthly learning paths count (for usage) ───────────────────
  SELECT count(*) INTO _monthly_learning_paths
  FROM learning_paths
  WHERE user_id = _uid
    AND created_at >= _start_of_month;

  -- ── Build combined result ─────────────────────────────────────────
  RETURN json_build_object(
    'user', json_build_object(
      'email', _user_email,
      'planType', _user_plan_type,
      'role', _user_role,
      'isBanned', _user_is_banned
    ),
    'stats', json_build_object(
      'totalProjects', _total_projects,
      'uniqueTechnologies', _unique_technologies,
      'monthlyChats', _monthly_chats,
      'learningProgress', json_build_object(
        'completed', _completed_modules,
        'total', _total_modules,
        'percentage', _learning_percentage
      )
    ),
    'recentProjects', _recent_projects,
    'techDistribution', _tech_distribution,
    'currentLearning', _current_learning,
    'usage', json_build_object(
      'projectsUsed', _total_projects,
      'learningPathsUsed', _monthly_learning_paths,
      'aiChatsUsed', _monthly_chats
    )
  );
END;
$$;
