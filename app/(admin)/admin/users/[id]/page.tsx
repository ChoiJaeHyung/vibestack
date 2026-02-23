import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserDetail } from "@/server/actions/admin";
import { getCurrentUserRole } from "@/lib/utils/user-role";
import { AdminUserDetail } from "@/components/features/admin-user-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const [result, roleInfo] = await Promise.all([
    getUserDetail(id),
    getCurrentUserRole(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {result.data.email}
        </h1>
      </div>

      <AdminUserDetail
        user={result.data}
        currentUserRole={roleInfo?.role ?? "user"}
      />
    </div>
  );
}
