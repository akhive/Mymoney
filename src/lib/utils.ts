import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)", symbol: "$" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "GBP", label: "British Pound (£)", symbol: "£" },
  { code: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
  { code: "AED", label: "UAE Dirham (د.إ)", symbol: "د.إ" },
  { code: "SAR", label: "Saudi Riyal (﷼)", symbol: "﷼" },
  { code: "PKR", label: "Pakistani Rupee (Rs)", symbol: "Rs" },
  { code: "BDT", label: "Bangladeshi Taka (৳)", symbol: "৳" },
  { code: "CAD", label: "Canadian Dollar (C$)", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar (A$)", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
  { code: "CNY", label: "Chinese Yuan (¥)", symbol: "¥" },
] as const;

export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
