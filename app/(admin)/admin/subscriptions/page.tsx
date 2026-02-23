import { listAllUsers } from "@/server/actions/admin";
import { AdminUserTable } from "@/components/features/admin-user-table";

export default async function AdminSubscriptionsPage() {
  const result = await listAllUsers(1);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Subscription Management
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        View and manage user subscriptions. Click on a user to change their plan.
      </p>

      <AdminUserTable
        initialUsers={result.success && result.data ? result.data.items : []}
        initialTotal={result.success && result.data ? result.data.total : 0}
        initialPage={1}
        pageSize={20}
      />
    </div>
  );
}
