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
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2">
                <Icon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-text-muted">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-text-primary">
                  {stat.value}
                </p>
                {stat.detail && (
                  <p className="text-xs text-text-faint">
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
