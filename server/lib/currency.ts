const CURRENCY_SCALE: Record<string, number> = {
  USD: 100,
  GBP: 100,
  EUR: 100,
  NGN: 100,
  KWD: 1000,
};

export function toMinorUnits(amount: number, currency: string): bigint {
  const scale = CURRENCY_SCALE[currency] ?? 100;
  return BigInt(Math.round(amount * scale));
}

export function toDecimal(amount: bigint, currency: string): number {
  const scale = CURRENCY_SCALE[currency] ?? 100;
  return Number(amount) / scale;
}
