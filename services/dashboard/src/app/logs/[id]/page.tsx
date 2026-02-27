import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogLevelBadge } from "@/components/logs/log-level-badge";
import { severityColor, formatDate } from "@/lib/utils";
import { ArrowLeft, Clock, Brain } from "lucide-react";
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
        <Button variant="ghost" size="icon" asChild>
          <Link href="/logs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Log #{Number(log.id)}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(log.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{log.source}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <LogLevelBadge level={log.level} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mensagem</p>
              <p className="mt-1 rounded-md bg-muted p-3 font-mono text-sm">
                {log.message}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Metadata</p>
              <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Diagnostico IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostic ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Severidade</p>
                  <Badge className={severityColor(diagnostic.severity) + " mt-1"}>
                    {diagnostic.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resumo</p>
                  <p className="mt-1">{diagnostic.summary}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sugestao</p>
                  <p className="mt-1 rounded-md bg-muted p-3 text-sm">
                    {diagnostic.suggestion ?? "Sem sugestao"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo</p>
                    <p className="text-sm font-mono">{diagnostic.model_used}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Analisado em</p>
                    <p className="text-sm">{formatDate(diagnostic.created_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="mb-3 h-10 w-10" />
                <p className="text-lg font-medium">Aguardando analise...</p>
                <p className="text-sm">O AI Worker esta processando este log.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
