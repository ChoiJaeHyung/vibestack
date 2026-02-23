"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin, requireSuperAdmin, isAdminAuthResult } from "@/server/middleware/admin-auth";
import { invalidateSettingsCache } from "@/lib/utils/system-settings";
import type { UserRole, Json } from "@/types/database";

// ─── Response Types ──────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AdminDashboardStats {
  totalUsers: number;
  totalProjects: number;
  planDistribution: { plan_type: string; count: number }[];
  recentSignups: {
    id: string;
    email: string;
    name: string | null;
    plan_type: string;
    created_at: string;
  }[];
}

interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  plan_type: string;
  role: string;
  is_banned: boolean;
  created_at: string;
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan_type: string;
  role: string;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
  projectCount: number;
  learningPathCount: number;
  conversationCount: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface SystemSettingItem {
  id: string;
  setting_key: string;
  setting_value: Json;
  category: string;
  description: string | null;
  updated_at: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  admin_id: string;
  admin_email?: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Json;
  created_at: string;
}

interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  user_id: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
}

interface LearningPathListItem {
  id: string;
  title: string;
  status: string;
  user_id: string;
  user_email?: string;
  difficulty: string | null;
  total_modules: number;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

async function logAuditAction(
  adminId: string,
  actionType: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action_type: actionType,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      details: (details ?? {}) as Json,
    });
  } catch {
    // Audit log failure should not block the main action
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────

export async function getAdminDashboardStats(): Promise<ActionResult<AdminDashboardStats>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { count: totalUsers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    const { count: totalProjects } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true });

    // Plan distribution
    const { data: allUsers } = await supabase
      .from("users")
      .select("plan_type");

    const planMap = new Map<string, number>();
    for (const u of allUsers ?? []) {
      const plan = u.plan_type ?? "free";
      planMap.set(plan, (planMap.get(plan) ?? 0) + 1);
    }
    const planDistribution = Array.from(planMap.entries()).map(([plan_type, count]) => ({
      plan_type,
      count,
    }));

    // Recent signups (last 10)
    const { data: recentSignupsData } = await supabase
      .from("users")
      .select("id, email, name, plan_type, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      success: true,
      data: {
        totalUsers: totalUsers ?? 0,
        totalProjects: totalProjects ?? 0,
        planDistribution,
        recentSignups: recentSignupsData ?? [],
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}

// ─── User Management ─────────────────────────────────────────────────

export async function listAllUsers(
  page: number = 1,
  search?: string,
  roleFilter?: UserRole,
  planFilter?: "free" | "pro" | "team",
): Promise<ActionResult<PaginatedResult<UserListItem>>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabase
      .from("users")
      .select("id, email, name, plan_type, role, is_banned, created_at", { count: "exact" });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (roleFilter) {
      query = query.eq("role", roleFilter);
    }
    if (planFilter) {
      query = query.eq("plan_type", planFilter);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return { success: false, error: "Failed to fetch users" };

    return {
      success: true,
      data: {
        items: (data ?? []) as UserListItem[],
        total: count ?? 0,
        page,
        pageSize: PAGE_SIZE,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch users" };
  }
}

export async function getUserDetail(userId: string): Promise<ActionResult<UserDetail>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) return { success: false, error: "User not found" };

    const { count: projectCount } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: learningPathCount } = await supabase
      .from("learning_paths")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { count: conversationCount } = await supabase
      .from("ai_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        plan_type: user.plan_type,
        role: user.role ?? "user",
        is_banned: user.is_banned ?? false,
        banned_at: user.banned_at ?? null,
        ban_reason: user.ban_reason ?? null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        projectCount: projectCount ?? 0,
        learningPathCount: learningPathCount ?? 0,
        conversationCount: conversationCount ?? 0,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch user detail" };
  }
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  if (auth.userId === userId) {
    return { success: false, error: "Cannot change your own role" };
  }

  try {
    const supabase = createServiceClient();

    const { data: targetUser } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", userId)
      .single();

    const { error } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { success: false, error: "Failed to update role" };

    await logAuditAction(auth.userId, "update_role", "user", userId, {
      previous_role: targetUser?.role ?? "user",
      new_role: newRole,
      target_email: targetUser?.email,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update role" };
  }
}

export async function banUser(userId: string, reason: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  if (auth.userId === userId) {
    return { success: false, error: "Cannot ban yourself" };
  }

  try {
    const supabase = createServiceClient();

    const { data: targetUser } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", userId)
      .single();

    // Cannot ban super_admin
    if (targetUser?.role === "super_admin") {
      return { success: false, error: "Cannot ban a super admin" };
    }

    const { error } = await supabase
      .from("users")
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) return { success: false, error: "Failed to ban user" };

    await logAuditAction(auth.userId, "ban_user", "user", userId, {
      reason,
      target_email: targetUser?.email,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to ban user" };
  }
}

export async function unbanUser(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: targetUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    const { error } = await supabase
      .from("users")
      .update({
        is_banned: false,
        banned_at: null,
        ban_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) return { success: false, error: "Failed to unban user" };

    await logAuditAction(auth.userId, "unban_user", "user", userId, {
      target_email: targetUser?.email,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to unban user" };
  }
}

export async function overrideUserPlan(
  userId: string,
  planType: "free" | "pro" | "team",
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: targetUser } = await supabase
      .from("users")
      .select("plan_type, email")
      .eq("id", userId)
      .single();

    const { error } = await supabase
      .from("users")
      .update({ plan_type: planType, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { success: false, error: "Failed to update plan" };

    await logAuditAction(auth.userId, "override_plan", "user", userId, {
      previous_plan: targetUser?.plan_type,
      new_plan: planType,
      target_email: targetUser?.email,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update plan" };
  }
}

// ─── System Settings ─────────────────────────────────────────────────

export async function getSystemSettings(
  category?: "llm_config" | "pricing" | "announcement" | "feature_toggle" | "general",
): Promise<ActionResult<SystemSettingItem[]>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("system_settings")
      .select("id, setting_key, setting_value, category, description, updated_at")
      .order("category")
      .order("setting_key");

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: "Failed to fetch settings" };

    return { success: true, data: (data ?? []) as SystemSettingItem[] };
  } catch {
    return { success: false, error: "Failed to fetch settings" };
  }
}

export async function updateSystemSetting(
  key: string,
  value: Json,
  category: "llm_config" | "pricing" | "announcement" | "feature_toggle" | "general",
  description?: string,
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("system_settings")
      .select("id, setting_value")
      .eq("setting_key", key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: value,
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
          ...(description !== undefined ? { description } : {}),
        })
        .eq("setting_key", key);

      if (error) return { success: false, error: "Failed to update setting" };
    } else {
      const { error } = await supabase
        .from("system_settings")
        .insert({
          setting_key: key,
          setting_value: value,
          category,
          description: description ?? null,
          updated_by: auth.userId,
        });

      if (error) return { success: false, error: "Failed to create setting" };
    }

    invalidateSettingsCache(key);

    await logAuditAction(auth.userId, "update_setting", "system_settings", key, {
      previous_value: existing?.setting_value,
      new_value: value,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update setting" };
  }
}

// ─── Announcements ───────────────────────────────────────────────────

export async function listAnnouncements(): Promise<ActionResult<AnnouncementItem[]>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, content, announcement_type, is_active, starts_at, expires_at, created_at")
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: "Failed to fetch announcements" };

    return { success: true, data: (data ?? []) as AnnouncementItem[] };
  } catch {
    return { success: false, error: "Failed to fetch announcements" };
  }
}

export async function createAnnouncement(
  title: string,
  content: string,
  announcementType: "info" | "warning" | "maintenance" | "update",
  expiresAt?: string,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title,
        content,
        announcement_type: announcementType,
        expires_at: expiresAt ?? null,
        created_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: "Failed to create announcement" };

    await logAuditAction(auth.userId, "create_announcement", "announcement", data.id, {
      title,
      type: announcementType,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create announcement" };
  }
}

export async function updateAnnouncement(
  id: string,
  updates: {
    title?: string;
    content?: string;
    announcement_type?: "info" | "warning" | "maintenance" | "update";
    is_active?: boolean;
    expires_at?: string | null;
  },
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("announcements")
      .update(updates)
      .eq("id", id);

    if (error) return { success: false, error: "Failed to update announcement" };

    await logAuditAction(auth.userId, "update_announcement", "announcement", id, updates);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update announcement" };
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: "Failed to delete announcement" };

    await logAuditAction(auth.userId, "delete_announcement", "announcement", id);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete announcement" };
  }
}

// ─── Content Management ──────────────────────────────────────────────

export async function listAllProjects(
  page: number = 1,
  search?: string,
): Promise<ActionResult<PaginatedResult<ProjectListItem>>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabase
      .from("projects")
      .select("id, name, status, user_id, created_at, updated_at", { count: "exact" });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return { success: false, error: "Failed to fetch projects" };

    // Enrich with user emails
    const userIds = [...new Set((data ?? []).map((p) => p.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u.email]));

    const items: ProjectListItem[] = (data ?? []).map((p) => ({
      ...p,
      user_email: userMap.get(p.user_id),
    }));

    return {
      success: true,
      data: { items, total: count ?? 0, page, pageSize: PAGE_SIZE },
    };
  } catch {
    return { success: false, error: "Failed to fetch projects" };
  }
}

export async function listAllLearningPaths(
  page: number = 1,
  search?: string,
): Promise<ActionResult<PaginatedResult<LearningPathListItem>>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabase
      .from("learning_paths")
      .select("id, title, status, user_id, difficulty, total_modules, created_at", { count: "exact" });

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return { success: false, error: "Failed to fetch learning paths" };

    const userIds = [...new Set((data ?? []).map((p) => p.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u.email]));

    const items: LearningPathListItem[] = (data ?? []).map((p) => ({
      ...p,
      user_email: userMap.get(p.user_id),
    }));

    return {
      success: true,
      data: { items, total: count ?? 0, page, pageSize: PAGE_SIZE },
    };
  } catch {
    return { success: false, error: "Failed to fetch learning paths" };
  }
}

export async function deleteProjectAdmin(projectId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: project } = await supabase
      .from("projects")
      .select("name, user_id")
      .eq("id", projectId)
      .single();

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) return { success: false, error: "Failed to delete project" };

    await logAuditAction(auth.userId, "delete_project", "project", projectId, {
      project_name: project?.name,
      owner_id: project?.user_id,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete project" };
  }
}

export async function deleteLearningPathAdmin(pathId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: path } = await supabase
      .from("learning_paths")
      .select("title, user_id")
      .eq("id", pathId)
      .single();

    const { error } = await supabase
      .from("learning_paths")
      .delete()
      .eq("id", pathId);

    if (error) return { success: false, error: "Failed to delete learning path" };

    await logAuditAction(auth.userId, "delete_learning_path", "learning_path", pathId, {
      path_title: path?.title,
      owner_id: path?.user_id,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete learning path" };
  }
}

// ─── Audit Log ───────────────────────────────────────────────────────

export async function getAuditLog(
  page: number = 1,
  actionFilter?: string,
): Promise<ActionResult<PaginatedResult<AuditLogItem>>> {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) return { success: false, error: auth.error };

  try {
    const supabase = createServiceClient();
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabase
      .from("admin_audit_log")
      .select("id, admin_id, action_type, target_type, target_id, details, created_at", { count: "exact" });

    if (actionFilter) {
      query = query.eq("action_type", actionFilter);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return { success: false, error: "Failed to fetch audit log" };

    // Enrich with admin emails
    const adminIds = [...new Set((data ?? []).map((l) => l.admin_id))];
    const { data: admins } = await supabase
      .from("users")
      .select("id, email")
      .in("id", adminIds);

    const adminMap = new Map((admins ?? []).map((a) => [a.id, a.email]));

    const items: AuditLogItem[] = (data ?? []).map((l) => ({
      ...l,
      admin_email: adminMap.get(l.admin_id),
    }));

    return {
      success: true,
      data: { items, total: count ?? 0, page, pageSize: PAGE_SIZE },
    };
  } catch {
    return { success: false, error: "Failed to fetch audit log" };
  }
}

// ─── Active Announcements (for dashboard banner) ─────────────────────

export async function getActiveAnnouncements(): Promise<ActionResult<AnnouncementItem[]>> {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, content, announcement_type, is_active, starts_at, expires_at, created_at")
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: "Failed to fetch announcements" };

    return { success: true, data: (data ?? []) as AnnouncementItem[] };
  } catch {
    return { success: false, error: "Failed to fetch announcements" };
  }
}
