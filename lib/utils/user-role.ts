import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface UserRoleInfo {
  email: string;
  role: UserRole;
}

export async function getCurrentUserRole(): Promise<UserRoleInfo | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: userData } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", user.id)
      .single();

    if (!userData) return null;

    return {
      email: userData.email,
      role: (userData.role ?? "user") as UserRole,
    };
  } catch {
    return null;
  }
}
