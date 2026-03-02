"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TechChartProps {
  data: Array<{ category: string; count: number }>;
}

const CATEGORY_KEYS: Record<string, string> = {
  framework: "chart.framework",
  language: "chart.language",
  database: "chart.database",
  auth: "chart.auth",
  deploy: "chart.deploy",
  styling: "chart.styling",
  testing: "chart.testing",
  build_tool: "chart.buildTool",
  library: "chart.library",
  other: "chart.other",
};

export function TechChart({ data }: TechChartProps) {
  const t = useTranslations('Projects');

  const chartData = data.map((item) => ({
    ...item,
    label: CATEGORY_KEYS[item.category]
      ? t(CATEGORY_KEYS[item.category] as Parameters<typeof t>[0])
      : item.category,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontSize: "13px",
              color: "#f4f4f5",
            }}
            labelStyle={{ fontWeight: 600, color: "#f4f4f5" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="count"
            name={t('chart.count')}
            fill="#8B5CF6"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
