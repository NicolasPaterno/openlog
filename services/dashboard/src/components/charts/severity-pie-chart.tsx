"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

interface SeverityData {
  severity: string;
  count: number;
}

export function SeverityPieChart({ data }: { data: SeverityData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        Sem dados de severidade
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="count"
          nameKey="severity"
        >
          {data.map((entry) => (
            <Cell key={entry.severity} fill={COLORS[entry.severity] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
