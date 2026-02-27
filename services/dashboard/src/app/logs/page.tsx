import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle, Clock } from "lucide-react";
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
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground">{totalCount} logs encontrados</p>
      </div>

      <LogsFilters />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-24">Level</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-24">Diagnostico</TableHead>
                <TableHead className="w-40">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serializedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                serializedLogs.map((log: Record<string, unknown>) => {
                  const diag = (log.diagnostics as Record<string, unknown>[])?.[0];
                  return (
                    <TableRow key={log.id as number} className="cursor-pointer hover:bg-accent">
                      <TableCell>
                        <Link href={`/logs/${log.id}`} className="font-mono text-xs">
                          #{log.id as number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/logs/${log.id}`} className="font-medium">
                          {log.source as string}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <LogLevelBadge level={log.level as string} />
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        <Link href={`/logs/${log.id}`}>
                          {log.message as string}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {diag ? (
                          <Badge className={severityColor(diag.severity as string)}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {diag.severity as string}
                          </Badge>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(page - 1)}>Anterior</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(page + 1)}>Proxima</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
