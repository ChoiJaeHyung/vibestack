import { listAllUsers } from "@/server/actions/admin";
import { AdminUserTable } from "@/components/features/admin-user-table";

export default async function AdminUsersPage() {
  const result = await listAllUsers(1);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">
        User Management
      </h1>

      <AdminUserTable
        initialUsers={result.success && result.data ? result.data.items : []}
        initialTotal={result.success && result.data ? result.data.total : 0}
        initialPage={1}
        pageSize={20}
      />
    </div>
  );
}
