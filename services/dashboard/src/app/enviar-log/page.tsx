import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogForm } from "@/components/logs/log-form";

export const dynamic = "force-dynamic";

export default function EnviarLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enviar Log para Analise</h1>
        <p className="text-muted-foreground">
          Cadastre uma mensagem de log. Ela sera salva e enviada para analise pela IA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Log</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm />
        </CardContent>
      </Card>
    </div>
  );
}
