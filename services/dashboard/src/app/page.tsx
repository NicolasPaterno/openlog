import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeverityPieChart } from "@/components/charts/severity-pie-chart";
import { LogsBarChart } from "@/components/charts/logs-bar-chart";
import { severityColor, formatDate, serializeBigInt } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, ShieldCheck, Flame } from "lucide-react";
import Link from "next/link";

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

const severityIcons: Record<string, React.ElementType> = {
  low: ShieldCheck,
  medium: AlertTriangle,
  high: ShieldAlert,
  critical: Flame,
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {totals.totalLogs} logs ingeridos, {totals.totalDiagnostics} diagnosticos gerados
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {severities.map((sev) => {
          const Icon = severityIcons[sev];
          const count = severityMap[sev] ?? 0;
          return (
            <Card key={sev}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {sev}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logs por Dia (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <LogsBarChart data={logsPerDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <SeverityPieChart data={severityCounts} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diagnosticos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDiagnostics.length === 0 ? (
            <p className="text-muted-foreground">Nenhum diagnostico ainda.</p>
          ) : (
            <div className="space-y-4">
              {recentDiagnostics.map((d: Record<string, unknown>) => (
                <Link
                  key={d.id as number}
                  href={`/logs/${d.log_id}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={severityColor(d.severity as string)}>
                          {d.severity as string}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {(d.log as Record<string, unknown>)?.source as string}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm">{d.summary as string}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
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
