"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

export function LogsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentLevel = searchParams.get("level") ?? "";
  const currentSearch = searchParams.get("search") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/logs?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/logs");
  }, [router]);

  const hasFilters = currentLevel || currentSearch;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by message..."
        defaultValue={currentSearch}
        onChange={(e) => {
          const timer = setTimeout(() => updateParam("search", e.target.value), 400);
          return () => clearTimeout(timer);
        }}
        className="w-64"
      />
      <Select
        value={currentLevel}
        onValueChange={(val) => updateParam("level", val)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          {LEVELS.map((level) => (
            <SelectItem key={level} value={level}>
              {level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
