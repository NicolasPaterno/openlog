import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogLevelBadge } from "@/components/logs/log-level-badge";
import { LogsFilters } from "@/components/logs/logs-filters";
import { formatDate, severityColor, serializeBigInt } from "@/lib/utils";
import { CheckCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

interface PageProps {
  searchParams: Promise<{ page?: string; level?: string; search?: string }>;
}

export default async function LogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const level = params.level ?? "";
  const search = params.search ?? "";

  const where: Prisma.logsWhereInput = {};
  if (level) where.level = level;
  if (search) where.message = { contains: search, mode: "insensitive" };

  const [logs, totalCount] = await Promise.all([
    prisma.logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        diagnostics: {
          select: { id: true, severity: true },
          take: 1,
        },
      },
    }),
    prisma.logs.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const serializedLogs = serializeBigInt(logs);

  function buildPageUrl(p: number) {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (level) params.set("level", level);
    if (search) params.set("search", search);
    const qs = params.toString();
    return `/logs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount.toLocaleString("en-US")} logs found
        </p>
      </div>

      <LogsFilters />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wider">ID</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Source</TableHead>
                <TableHead className="w-24 text-[11px] font-semibold uppercase tracking-wider">Level</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Message</TableHead>
                <TableHead className="w-28 text-[11px] font-semibold uppercase tracking-wider">Diagnostic</TableHead>
                <TableHead className="w-40 text-[11px] font-semibold uppercase tracking-wider">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serializedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                serializedLogs.map((log: Record<string, unknown>) => {
                  const diag = (log.diagnostics as Record<string, unknown>[])?.[0];
                  return (
                    <TableRow key={log.id as number} className="group cursor-pointer transition-colors hover:bg-accent/50">
                      <TableCell>
                        <Link href={`/logs/${log.id}`} className="font-mono text-[11px] text-muted-foreground">
                          #{log.id as number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/logs/${log.id}`} className="text-sm font-medium font-mono group-hover:text-primary transition-colors">
                          {log.source as string}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <LogLevelBadge level={log.level as string} />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <Link href={`/logs/${log.id}`} className="block truncate text-sm text-foreground/70 group-hover:text-foreground transition-colors">
                          {log.message as string}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {diag ? (
                          <Badge className={severityColor(diag.severity as string) + " text-[10px]"}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {diag.severity as string}
                          </Badge>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3 animate-pulse" /> Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] tabular-nums text-muted-foreground">
                        {formatDate(log.created_at as string)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <Button variant="ghost" size="sm" asChild className="h-8 gap-1">
                <Link href={buildPageUrl(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="ghost" size="sm" asChild className="h-8 gap-1">
                <Link href={buildPageUrl(page + 1)}>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
