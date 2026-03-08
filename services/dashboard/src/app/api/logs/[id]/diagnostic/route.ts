import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logId = parseInt(id, 10);
  if (isNaN(logId)) {
    return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
  }

  const diagnostic = await prisma.diagnostics.findFirst({
    where: { log_id: logId },
    orderBy: { created_at: "desc" },
  });

  if (!diagnostic) {
    return NextResponse.json({ diagnostic: null });
  }

  return NextResponse.json({
    diagnostic: {
      id: Number(diagnostic.id),
      severity: diagnostic.severity,
      summary: diagnostic.summary,
      suggestion: diagnostic.suggestion,
      model_used: diagnostic.model_used,
      created_at: diagnostic.created_at.toISOString(),
    },
  });
}
