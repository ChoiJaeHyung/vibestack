import { createClient } from "@/lib/supabase/server";

export async function isCurrentUserBanned(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: userData } = await supabase
      .from("users")
      .select("is_banned")
      .eq("id", user.id)
      .single();

    return userData?.is_banned ?? false;
  } catch {
    return false;
  }
}
