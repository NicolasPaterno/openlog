"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface SourceData {
  source: string;
  ERROR: number;
  FATAL: number;
  WARN: number;
  INFO: number;
  DEBUG: number;
}

const LEVEL_COLORS: Record<string, string> = {
  FATAL: "#c084fc",
  ERROR: "#f87171",
  WARN: "#facc15",
  INFO: "#60a5fa",
  DEBUG: "#9ca3af",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-bold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SourceBarChart({ data }: { data: SourceData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" vertical={false} />
        <XAxis
          dataKey="source"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
        />
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <Bar
            key={level}
            dataKey={level}
            stackId="a"
            fill={color}
            radius={level === "FATAL" ? [3, 3, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
