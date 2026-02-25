import { redirect } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/ui/sidebar";
import { AnnouncementBanner } from "@/components/features/announcement-banner";
import { AuthStateListener } from "@/components/features/auth-state-listener";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined;
  let userRole: UserRole = "user";

  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      redirect("/login");
    }

    userEmail = authUser.email;

    const profile = await getUserProfile();

    userRole = profile?.role ?? "user";

    if (profile?.isBanned) {
      redirect("/login?error=banned");
    }
  } catch {
    // If Supabase is not configured, allow access for development
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      userEmail = "dev@localhost";
    } else {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen">
      <AuthStateListener />
      <Sidebar userEmail={userEmail} userRole={userRole} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-6 py-8 pt-16 lg:pt-8">
          <AnnouncementBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
