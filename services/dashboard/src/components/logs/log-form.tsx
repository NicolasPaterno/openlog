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
import { Loader2, Send } from "lucide-react";

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
        setError("Invalid metadata. Use valid JSON (e.g. {\"key\": \"value\"})");
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
      setError(err instanceof Error ? err.message : "Failed to send. Check if the API is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="source" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Source
        </label>
        <Input
          id="source"
          name="source"
          placeholder="Ex: api-gateway, user-service"
          className="font-mono text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="level" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
        <label htmlFor="message" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Message
        </label>
        <Input
          id="message"
          name="message"
          placeholder="Ex: Connection timeout to upstream service"
          required
        />
      </div>

      <div>
        <label htmlFor="metadata" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full rounded-lg">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit for Analysis
          </>
        )}
      </Button>
    </form>
  );
}
