import { cache } from "react";
import { headers } from "next/headers";
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
  // Fast path: read verified user from middleware-injected headers (~0ms)
  // Middleware already checked is_banned — banned users never get x-user-id header.
  const h = await headers();
  const userId = h.get("x-user-id");
  const userEmail = h.get("x-user-email");

  if (userId) {
    return { id: userId, email: userEmail ?? "" };
  }

  // Slow path: call Supabase Auth API (~500ms network round-trip)
  // This path is for cases where middleware didn't run (e.g., direct API calls).
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Slow path must also check is_banned since middleware didn't handle it
  const { data: userData } = await supabase
    .from("users")
    .select("is_banned")
    .eq("id", user.id)
    .single();
  if (userData?.is_banned) return null;

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
  if (!data || data.is_banned) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    role: (data.role as UserRole) ?? "user",
    isBanned: false,
    planType: (data.plan_type ?? "free") as "free" | "pro" | "team",
    planExpiresAt: data.plan_expires_at,
  };
});
