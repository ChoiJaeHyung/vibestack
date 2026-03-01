import { redirect } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/ui/sidebar";
import { AnnouncementBanner } from "@/components/features/announcement-banner";
import { AuthStateListener } from "@/components/features/auth-state-listener";
import { TutorPanelProvider } from "@/components/features/tutor-panel-context";
import { DashboardMain } from "@/components/features/dashboard-main";
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
    <div className="min-h-screen bg-background">
      <AuthStateListener />
      <Sidebar userEmail={userEmail} userRole={userRole} />
      <TutorPanelProvider>
        <DashboardMain>
          <AnnouncementBanner />
          {children}
        </DashboardMain>
      </TutorPanelProvider>
    </div>
  );
}
