import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface AdminAuthResult {
  userId: string;
  email: string;
  role: UserRole;
}

interface AdminAuthError {
  error: string;
  status: number;
}

export async function requireAdmin(): Promise<AdminAuthResult | AdminAuthError> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated", status: 401 };
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, is_banned, email")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return { error: "User not found", status: 404 };
    }

    if (userData.is_banned) {
      return { error: "Account is banned", status: 403 };
    }

    if (userData.role !== "admin" && userData.role !== "super_admin") {
      return { error: "Admin access required", status: 403 };
    }

    return {
      userId: user.id,
      email: userData.email,
      role: userData.role as UserRole,
    };
  } catch {
    return { error: "Authentication failed", status: 500 };
  }
}

export async function requireSuperAdmin(): Promise<AdminAuthResult | AdminAuthError> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated", status: 401 };
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, is_banned, email")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return { error: "User not found", status: 404 };
    }

    if (userData.is_banned) {
      return { error: "Account is banned", status: 403 };
    }

    if (userData.role !== "super_admin") {
      return { error: "Super admin access required", status: 403 };
    }

    return {
      userId: user.id,
      email: userData.email,
      role: userData.role as UserRole,
    };
  } catch {
    return { error: "Authentication failed", status: 500 };
  }
}

export function isAdminAuthResult(
  result: AdminAuthResult | AdminAuthError,
): result is AdminAuthResult {
  return "userId" in result;
}
