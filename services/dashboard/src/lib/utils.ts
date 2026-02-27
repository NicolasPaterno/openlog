import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

export function levelColor(level: string): string {
  const map: Record<string, string> = {
    DEBUG: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    INFO: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    WARN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    ERROR: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    FATAL: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  };
  return map[level] ?? "bg-gray-100 text-gray-700";
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return map[severity] ?? "bg-gray-100 text-gray-700";
}

export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}
