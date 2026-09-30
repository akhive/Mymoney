import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const CURRENCIES = [
  { code: "USD", label: "USD ($)" },
  { code: "AED", label: "AED (AED)" },
  { code: "INR", label: "INR (₹)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "SAR", label: "SAR (SAR)" },
  { code: "QAR", label: "QAR (QAR)" },
  { code: "OMR", label: "OMR (OMR)" },
  { code: "KWD", label: "KWD (KWD)" },
  { code: "BHD", label: "BHD (BHD)" },
];
