import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    userEmail = user.email;
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
      <Sidebar userEmail={userEmail} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-6 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
