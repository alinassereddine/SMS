import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function generateInvoiceNumber(prefix: string = "INV"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateSaleNumber(): string {
  return generateInvoiceNumber("SALE");
}

export function generateSessionNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CR-${dateStr}-${random}`;
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return Math.round(parseFloat(cleaned) * 100) || 0;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    out_of_stock: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sold: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    open: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    closed: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    unpaid: "bg-red-500/10 text-red-600 dark:text-red-400",
    partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    full: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    credit: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return colors[status.toLowerCase()] || colors.archived;
}

export function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    cash: "banknotes",
    card: "credit-card",
    transfer: "arrow-right-left",
    check: "file-text",
  };
  return icons[method.toLowerCase()] || "circle";
}

export function sortByName<T extends { name?: string | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" }),
  );
}
