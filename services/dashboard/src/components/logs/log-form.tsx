"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

export function LogForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState("INFO");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    let metadata: Record<string, unknown> = {};
    const metadataStr = formData.get("metadata") as string;
    if (metadataStr?.trim()) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        setError("Metadata invalido. Use JSON valido (ex: {\"key\": \"value\"})");
        setLoading(false);
        return;
      }
    }

    const payload = {
      source: formData.get("source") as string,
      level,
      message: formData.get("message") as string,
      metadata,
    };

    try {
      const res = await fetch(`${apiUrl}/api/v1/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.details || `Erro ${res.status}`);
        return;
      }

      router.push(`/logs/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar. Verifique se a API esta rodando.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="source" className="mb-2 block text-sm font-medium">
          Source
        </label>
        <Input
          id="source"
          name="source"
          placeholder="Ex: api-gateway, user-service"
          required
        />
      </div>

      <div>
        <label htmlFor="level" className="mb-2 block text-sm font-medium">
          Level
        </label>
        <Select value={level} onValueChange={setLevel} required>
          <SelectTrigger id="level">
            <SelectValue placeholder="Selecione o level" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium">
          Mensagem
        </label>
        <Input
          id="message"
          name="message"
          placeholder="Ex: Connection timeout to upstream service"
          required
        />
      </div>

      <div>
        <label htmlFor="metadata" className="mb-2 block text-sm font-medium">
          Metadata (JSON) — opcional
        </label>
        <Input
          id="metadata"
          name="metadata"
          placeholder='{"latency_ms": 5200, "service": "auth"}'
          className="font-mono text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar para Analise"
        )}
      </Button>
    </form>
  );
}
