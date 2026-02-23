import { getAdminDashboardStats } from "@/server/actions/admin";
import { AdminStatsCards } from "@/components/features/admin-stats-cards";

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardStats();

  if (!result.success || !result.data) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Admin Dashboard
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Failed to load dashboard stats.
        </p>
      </div>
    );
  }

  const { totalUsers, totalProjects, planDistribution, recentSignups } = result.data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
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
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Signups
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {recentSignups.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {user.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {user.plan_type}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
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
