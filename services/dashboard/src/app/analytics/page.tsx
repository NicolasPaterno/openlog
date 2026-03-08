import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogsTimelineChart } from "@/components/charts/logs-timeline-chart";
import { SourceBarChart } from "@/components/charts/source-bar-chart";
import { Badge } from "@/components/ui/badge";
import { levelColor } from "@/lib/utils";
import { Clock, Zap, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function getLogsTimeline() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await prisma.logs.findMany({
    where: { created_at: { gte: thirtyDaysAgo } },
    select: { created_at: true },
    orderBy: { created_at: "asc" },
  });

  const grouped: Record<string, number> = {};
  for (const log of logs) {
    const day = log.created_at.toISOString().split("T")[0];
    grouped[day] = (grouped[day] ?? 0) + 1;
  }

  return Object.entries(grouped).map(([date, count]) => ({ date, count }));
}

async function getLogsBySourceAndLevel() {
  const logs = await prisma.logs.groupBy({
    by: ["source", "level"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const sourceMap: Record<string, Record<string, number>> = {};
  for (const row of logs) {
    if (!sourceMap[row.source]) {
      sourceMap[row.source] = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
    }
    sourceMap[row.source][row.level] = row._count.id;
  }

  return Object.entries(sourceMap).map(([source, levels]) => ({
    source,
    ...levels,
  }));
}

async function getTopErrorSources() {
  const results = await prisma.logs.groupBy({
    by: ["source"],
    where: { level: { in: ["ERROR", "FATAL"] } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  return results.map((r) => ({
    source: r.source,
    count: r._count.id,
  }));
}

async function getAvgAnalysisTime() {
  const diagnostics = await prisma.diagnostics.findMany({
    select: {
      created_at: true,
      log: { select: { created_at: true } },
    },
    take: 100,
    orderBy: { created_at: "desc" },
  });

  if (diagnostics.length === 0) return null;

  const totalMs = diagnostics.reduce((sum, d) => {
    const diff = d.created_at.getTime() - d.log.created_at.getTime();
    return sum + diff;
  }, 0);

  return Math.round(totalMs / diagnostics.length / 1000);
}

export default async function AnalyticsPage() {
  const [timeline, sourceData, topErrors, avgTime] = await Promise.all([
    getLogsTimeline(),
    getLogsBySourceAndLevel(),
    getTopErrorSources(),
    getAvgAnalysisTime(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Metrics and trends from your logs
        </p>
      </div>

      {/* Metric cards row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {avgTime !== null && (
          <Card className="stat-glow-green transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{avgTime}s</p>
                <p className="text-xs text-muted-foreground">Avg. analysis time</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="stat-glow-yellow transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{timeline.length}</p>
              <p className="text-xs text-muted-foreground">Active days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-glow-red transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {topErrors.reduce((s, e) => s + e.count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total errors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline chart */}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Log Volume — 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LogsTimelineChart data={timeline} />
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Logs by Source & Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SourceBarChart data={sourceData as never[]} />
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Top Error Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="mb-3 h-8 w-8 opacity-40" />
                <p className="text-sm">No errors recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topErrors.map((item, idx) => {
                  const maxCount = topErrors[0].count;
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.source} className="group rounded-lg border border-border/50 p-3 transition-all hover:border-primary/20 hover:bg-accent/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-bold tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium font-mono">{item.source}</span>
                        </div>
                        <Badge className={levelColor("ERROR") + " text-[10px]"}>
                          {item.count}
                        </Badge>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-red-500/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
