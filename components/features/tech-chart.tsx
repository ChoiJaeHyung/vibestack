"use client";

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

const CATEGORY_LABELS: Record<string, string> = {
  framework: "프레임워크",
  language: "언어",
  database: "DB",
  auth: "인증",
  deploy: "배포",
  styling: "스타일링",
  testing: "테스팅",
  build_tool: "빌드",
  library: "라이브러리",
  other: "기타",
};

function translateCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function TechChart({ data }: TechChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: translateCategory(item.category),
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
            name="개수"
            fill="#8B5CF6"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
