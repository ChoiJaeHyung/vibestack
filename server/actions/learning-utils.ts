"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/types/database";

// ─── Locale Helpers ──────────────────────────────────────────────────

/** Fetch user's preferred locale from the users table */
export async function getUserLocale(userId: string): Promise<Locale> {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("users")
    .select("locale")
    .eq("id", userId)
    .single();
  return (data?.locale as Locale) ?? "ko";
}

/**
 * Get the authenticated user's locale. For use in server components.
 */
export async function getAuthUserLocale(): Promise<Locale> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "ko";
    return getUserLocale(user.id);
  } catch {
    return "ko";
  }
}

/**
 * Update the user's learning content locale preference.
 */
export async function updateUserLocale(
  locale: Locale,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from("users")
      .update({ locale })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update locale" };
  }
}
