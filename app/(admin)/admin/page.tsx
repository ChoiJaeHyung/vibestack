import { getAdminDashboardStats } from "@/server/actions/admin";
import { AdminStatsCards } from "@/components/features/admin-stats-cards";

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardStats();

  if (!result.success || !result.data) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">
          Admin Dashboard
        </h1>
        <p className="text-text-muted">
          Failed to load dashboard stats.
        </p>
      </div>
    );
  }

  const { totalUsers, totalProjects, planDistribution, recentSignups } = result.data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">
        Admin Dashboard
      </h1>

      <AdminStatsCards
        totalUsers={totalUsers}
        totalProjects={totalProjects}
        planDistribution={planDistribution}
        recentSignupCount={recentSignups.length}
      />

      {/* Recent Signups */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Recent Signups
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border-default">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-surface">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Email</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {recentSignups.map((user) => (
                <tr key={user.id} className="hover:bg-bg-surface">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.plan_type}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                    No recent signups
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
