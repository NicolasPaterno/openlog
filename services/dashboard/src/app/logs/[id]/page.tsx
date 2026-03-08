import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogLevelBadge } from "@/components/logs/log-level-badge";
import { DiagnosticPanel } from "@/components/logs/diagnostic-panel";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Brain, Terminal } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SerializedDiagnostic {
  id: number;
  severity: string;
  summary: string;
  suggestion: string | null;
  model_used: string | null;
  created_at: string;
}

export default async function LogDetailPage({ params }: PageProps) {
  const { id } = await params;
  const logId = parseInt(id, 10);
  if (isNaN(logId)) notFound();

  const log = await prisma.logs.findUnique({
    where: { id: logId },
    include: {
      diagnostics: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  if (!log) notFound();

  const diagnostic: SerializedDiagnostic | null = log.diagnostics[0]
    ? {
        id: Number(log.diagnostics[0].id),
        severity: log.diagnostics[0].severity,
        summary: log.diagnostics[0].summary,
        suggestion: log.diagnostics[0].suggestion,
        model_used: log.diagnostics[0].model_used,
        created_at: log.diagnostics[0].created_at.toISOString(),
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg">
          <Link href="/logs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Log <span className="font-mono text-primary">#{Number(log.id)}</span>
          </h1>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatDate(log.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Terminal className="h-4 w-4" />
              Log Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Source</p>
                <p className="mt-1 font-medium font-mono text-sm">{log.source}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Level</p>
                <div className="mt-1">
                  <LogLevelBadge level={log.level} />
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Message</p>
              <p className="mt-1.5 rounded-lg bg-muted/50 p-3 font-mono text-sm leading-relaxed">
                {log.message}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Metadata</p>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Brain className="h-4 w-4" />
              AI Diagnostic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosticPanel logId={Number(log.id)} initial={diagnostic} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
