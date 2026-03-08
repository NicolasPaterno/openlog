"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  low: "#4ade80",
  medium: "#facc15",
  high: "#fb923c",
  critical: "#f87171",
};

const LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

interface SeverityData {
  severity: string;
  count: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium capitalize text-muted-foreground">{item.name}</p>
      <p className="text-lg font-bold tabular-nums">{item.value}</p>
    </div>
  );
}

export function SeverityPieChart({ data }: { data: SeverityData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No severity data
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width="55%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="count"
            nameKey="severity"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.severity} fill={COLORS[entry.severity] ?? "#6b7280"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-2xl font-bold"
          >
            {total}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px]"
          >
            total
          </text>
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-col gap-3">
        {data.map((entry) => {
          const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
          return (
            <div key={entry.severity} className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[entry.severity] ?? "#6b7280" }}
              />
              <div>
                <p className="text-sm font-medium">{LABELS[entry.severity] ?? entry.severity}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {entry.count} ({pct}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
