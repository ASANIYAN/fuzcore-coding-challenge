import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    ...options,
  });
}
