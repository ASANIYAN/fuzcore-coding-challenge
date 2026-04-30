import { z } from "zod";

const amountInputRegex = /^\d+(\.\d{1,2})?$/;

export function normalizeAmountInput(value: string) {
  const sanitized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = sanitized.split(".");
  const decimalPart = decimalParts.join("");

  if (sanitized.startsWith(".")) {
    return `0.${decimalPart}`;
  }

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart}.${decimalPart}`;
}

export function formatAmountInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const normalized =
    typeof value === "number" ? value.toString() : normalizeAmountInput(value);

  if (!normalized) {
    return "";
  }

  const [integerPart, decimalPart] = normalized.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decimalPart === undefined
    ? groupedInteger
    : `${groupedInteger}.${decimalPart}`;
}

export function parseAmountInput(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (!value) {
    return NaN;
  }

  const normalized = normalizeAmountInput(value);
  return normalized ? Number(normalized) : NaN;
}

export function amountInputSchema(fieldLabel: string) {
  return z
    .string()
    .trim()
    .min(1, `${fieldLabel} is required`)
    .transform((value) => normalizeAmountInput(value))
    .refine((value) => amountInputRegex.test(value), {
      message: `${fieldLabel} must contain only numbers and up to 2 decimal places`,
    })
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, {
      message: `${fieldLabel} must be greater than zero`,
    });
}
