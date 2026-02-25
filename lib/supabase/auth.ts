import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  isBanned: boolean;
  planType: "free" | "pro" | "team";
  planExpiresAt: string | null;
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? "" };
});

export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role, is_banned, plan_type, plan_expires_at")
    .eq("id", authUser.id)
    .single();
  if (!data) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    role: (data.role as UserRole) ?? "user",
    isBanned: data.is_banned ?? false,
    planType: (data.plan_type ?? "free") as "free" | "pro" | "team",
    planExpiresAt: data.plan_expires_at,
  };
});
