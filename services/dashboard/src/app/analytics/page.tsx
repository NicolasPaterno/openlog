import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogsTimelineChart } from "@/components/charts/logs-timeline-chart";
import { SourceBarChart } from "@/components/charts/source-bar-chart";
import { Badge } from "@/components/ui/badge";
import { levelColor } from "@/lib/utils";

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
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Metricas e tendencias dos logs</p>
      </div>

      {avgTime !== null && (
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-3">
              <span className="text-2xl font-bold text-primary">{avgTime}s</span>
            </div>
            <div>
              <p className="font-medium">Tempo medio de analise</p>
              <p className="text-sm text-muted-foreground">
                Do momento que o log e recebido ate o diagnostico ser gerado
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Volume de Logs (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <LogsTimelineChart data={timeline} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logs por Source e Level</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceBarChart data={sourceData as never[]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Sources com Erros</CardTitle>
          </CardHeader>
          <CardContent>
            {topErrors.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Sem erros registrados</p>
            ) : (
              <div className="space-y-3">
                {topErrors.map((item, idx) => (
                  <div key={item.source} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{item.source}</span>
                    </div>
                    <Badge className={levelColor("ERROR")}>{item.count} erros</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
