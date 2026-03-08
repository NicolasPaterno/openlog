import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeverityPieChart } from "@/components/charts/severity-pie-chart";
import { LogsBarChart } from "@/components/charts/logs-bar-chart";
import { severityColor, formatDate, serializeBigInt } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, ShieldCheck, Flame, Plus, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function getSeverityCounts() {
  const results = await prisma.diagnostics.groupBy({
    by: ["severity"],
    _count: { severity: true },
  });
  return results.map((r) => ({
    severity: r.severity,
    count: r._count.severity,
  }));
}

async function getLogsPerDay() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const logs = await prisma.logs.findMany({
    where: { created_at: { gte: sevenDaysAgo } },
    select: { created_at: true },
  });

  const grouped: Record<string, number> = {};
  for (const log of logs) {
    const day = log.created_at.toISOString().split("T")[0];
    grouped[day] = (grouped[day] ?? 0) + 1;
  }

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getRecentDiagnostics() {
  const results = await prisma.diagnostics.findMany({
    take: 5,
    orderBy: { created_at: "desc" },
    include: { log: { select: { source: true, level: true, message: true } } },
  });
  return serializeBigInt(results);
}

async function getTotalCounts() {
  const [totalLogs, totalDiagnostics] = await Promise.all([
    prisma.logs.count(),
    prisma.diagnostics.count(),
  ]);
  return { totalLogs, totalDiagnostics };
}

const severityConfig: Record<string, { icon: React.ElementType; glow: string }> = {
  low: { icon: ShieldCheck, glow: "stat-glow-green" },
  medium: { icon: AlertTriangle, glow: "stat-glow-yellow" },
  high: { icon: ShieldAlert, glow: "stat-glow-orange" },
  critical: { icon: Flame, glow: "stat-glow-red" },
};

export default async function DashboardPage() {
  const [severityCounts, logsPerDay, recentDiagnostics, totals] =
    await Promise.all([
      getSeverityCounts(),
      getLogsPerDay(),
      getRecentDiagnostics(),
      getTotalCounts(),
    ]);

  const severityMap: Record<string, number> = {};
  for (const s of severityCounts) {
    severityMap[s.severity] = s.count;
  }

  const severities = ["low", "medium", "high", "critical"] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your services health
          </p>
        </div>
        <Button asChild className="rounded-lg">
          <Link href="/enviar-log">
            <Plus className="mr-2 h-4 w-4" />
            New Log
          </Link>
        </Button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card/50 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{totals.totalLogs.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted-foreground">Logs ingested</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{totals.totalDiagnostics.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted-foreground">Diagnostics generated</p>
          </div>
        </div>
      </div>

      {/* Severity cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {severities.map((sev) => {
          const config = severityConfig[sev];
          const Icon = config.icon;
          const count = severityMap[sev] ?? 0;
          return (
            <Card key={sev} className={`${config.glow} transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md`}>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warm-muted">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{count}</p>
                  <p className="text-xs font-medium capitalize text-muted-foreground">{sev}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Log Volume — 7 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogsBarChart data={logsPerDay} />
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SeverityPieChart data={severityCounts} />
          </CardContent>
        </Card>
      </div>

      {/* Recent diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentDiagnostics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">No diagnostics yet.</p>
              <p className="text-xs">Submit a log to start the analysis.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDiagnostics.map((d: Record<string, unknown>) => (
                <Link
                  key={d.id as number}
                  href={`/logs/${d.log_id}`}
                  className="group block rounded-lg border border-border/50 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={severityColor(d.severity as string)}>
                          {d.severity as string}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {(d.log as Record<string, unknown>)?.source as string}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm text-foreground/80 group-hover:text-foreground">
                        {d.summary as string}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatDate(d.created_at as string)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
