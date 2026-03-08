"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { severityColor, formatDate } from "@/lib/utils";

interface Diagnostic {
  id: number;
  severity: string;
  summary: string;
  suggestion: string | null;
  model_used: string | null;
  created_at: string;
}

export function DiagnosticPanel({
  logId,
  initial,
}: {
  logId: number;
  initial: Diagnostic | null;
}) {
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(initial);
  const [polling, setPolling] = useState(!initial);

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/logs/${logId}/diagnostic`);
        const data = await res.json();
        if (data.diagnostic) {
          setDiagnostic(data.diagnostic);
          setPolling(false);
        }
      } catch {
        // silently retry on next interval
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [logId, polling]);

  if (!diagnostic) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Analyzing...</p>
        <p className="mt-1 text-xs">The AI Worker is processing this log.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Severity</p>
        <Badge className={severityColor(diagnostic.severity) + " mt-1"}>
          {diagnostic.severity}
        </Badge>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Summary</p>
        <p className="mt-1.5 text-sm leading-relaxed">{diagnostic.summary}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggestion</p>
        <p className="mt-1.5 rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm leading-relaxed">
          {diagnostic.suggestion ?? "No suggestion"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Model</p>
          <p className="mt-1 text-xs font-mono">{diagnostic.model_used}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Analyzed at</p>
          <p className="mt-1 text-xs tabular-nums">{formatDate(diagnostic.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
