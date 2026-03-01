import { listAllUsers } from "@/server/actions/admin";
import { AdminUserTable } from "@/components/features/admin-user-table";

export default async function AdminSubscriptionsPage() {
  const result = await listAllUsers(1);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-text-primary">
        Subscription Management
      </h1>
      <p className="mb-6 text-sm text-text-muted">
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
