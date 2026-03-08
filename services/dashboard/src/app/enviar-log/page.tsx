import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogForm } from "@/components/logs/log-form";
import { Send } from "lucide-react";

export const dynamic = "force-dynamic";

export default function EnviarLogPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a log message for AI-powered analysis.
        </p>
      </div>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Send className="h-4 w-4" />
            New Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm />
        </CardContent>
      </Card>
    </div>
  );
}
