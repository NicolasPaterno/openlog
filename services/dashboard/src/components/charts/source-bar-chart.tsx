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
  FATAL: "#a855f7",
  ERROR: "#ef4444",
  WARN: "#eab308",
  INFO: "#3b82f6",
  DEBUG: "#6b7280",
};

export function SourceBarChart({ data }: { data: SourceData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        Sem dados
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="source" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Legend />
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <Bar key={level} dataKey={level} stackId="a" fill={color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
