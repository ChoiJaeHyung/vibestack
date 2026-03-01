import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/utils/user-role";
import { AdminSidebar } from "@/components/features/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined;
  let userRole: "admin" | "super_admin" | undefined;

  try {
    const roleInfo = await getCurrentUserRole();

    if (!roleInfo) {
      redirect("/login");
    }

    if (roleInfo.role !== "admin" && roleInfo.role !== "super_admin") {
      redirect("/dashboard");
    }

    userEmail = roleInfo.email;
    userRole = roleInfo.role;
  } catch {
    if (process.env.NODE_ENV === "development") {
      userEmail = "dev@localhost";
      userRole = "super_admin";
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen">
      <AdminSidebar userEmail={userEmail} userRole={userRole!} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
