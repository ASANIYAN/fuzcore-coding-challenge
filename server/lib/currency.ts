export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", scale: 100 },
  { code: "GBP", name: "British Pound Sterling", symbol: "£", scale: 100 },
  { code: "EUR", name: "Euro", symbol: "€", scale: 100 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", scale: 100 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", scale: 1000 },
] as const;

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code,
);

const CURRENCY_SCALE = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency.scale]),
) as Record<string, number>;

export function isSupportedCurrency(currency: string) {
  return SUPPORTED_CURRENCY_CODES.includes(currency as (typeof SUPPORTED_CURRENCY_CODES)[number]);
}

export function listSupportedCurrencies() {
  return SUPPORTED_CURRENCIES.map(({ code, name, symbol }) => ({
    code,
    name,
    symbol,
  }));
}

export function toMinorUnits(amount: number, currency: string): bigint {
  const scale = CURRENCY_SCALE[currency];
  if (scale === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return BigInt(Math.round(amount * scale));
}

export function toDecimal(amount: bigint, currency: string): number {
  const scale = CURRENCY_SCALE[currency];
  if (scale === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return Number(amount) / scale;
}
