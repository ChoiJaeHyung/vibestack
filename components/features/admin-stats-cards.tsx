import { Users, FolderOpen, CreditCard, UserPlus } from "lucide-react";

interface AdminStatsCardsProps {
  totalUsers: number;
  totalProjects: number;
  planDistribution: { plan_type: string; count: number }[];
  recentSignupCount: number;
}

export function AdminStatsCards({
  totalUsers,
  totalProjects,
  planDistribution,
  recentSignupCount,
}: AdminStatsCardsProps) {
  const proCount = planDistribution.find((p) => p.plan_type === "pro")?.count ?? 0;
  const teamCount = planDistribution.find((p) => p.plan_type === "team")?.count ?? 0;
  const paidCount = proCount + teamCount;

  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      detail: `${paidCount} paid`,
    },
    {
      label: "Total Projects",
      value: totalProjects,
      icon: FolderOpen,
    },
    {
      label: "Plan Distribution",
      value: `${proCount} Pro / ${teamCount} Team`,
      icon: CreditCard,
      detail: `${totalUsers - paidCount} free`,
    },
    {
      label: "Recent Signups",
      value: recentSignupCount,
      icon: UserPlus,
      detail: "last 10 users",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stat.value}
                </p>
                {stat.detail && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {stat.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
