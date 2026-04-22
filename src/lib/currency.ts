export type CurrencyCode = 'USD' | 'ARS' | 'CLP' | 'PEN';
export type SupportedCountryCode = 'AR' | 'CL' | 'PE' | 'US' | 'OTHER';

export type ExchangeRates = {
  ARS: number;
  CLP: number;
  PEN: number;
};

type PriceSource = {
  entry_fee_usd?: number | string | null;
  prize_pool?: number | string | null;
};

const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  ARS: Number(process.env.NEXT_PUBLIC_USD_TO_ARS || 1400),
  CLP: Number(process.env.NEXT_PUBLIC_USD_TO_CLP || 950),
  PEN: Number(process.env.NEXT_PUBLIC_USD_TO_PEN || 3.75),
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  ARS: 'es-AR',
  CLP: 'es-CL',
  PEN: 'es-PE',
};

export const SUPPORTED_CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'USD', label: 'USD' },
  { code: 'ARS', label: 'ARS' },
  { code: 'CLP', label: 'CLP' },
  { code: 'PEN', label: 'PEN' },
];

export function getExchangeRates(): ExchangeRates {
  return DEFAULT_EXCHANGE_RATES;
}

export function normalizeCountryCode(value?: string | null): SupportedCountryCode {
  const normalized = value?.toUpperCase();

  if (normalized === 'AR' || normalized === 'CL' || normalized === 'PE' || normalized === 'US') {
    return normalized;
  }

  return 'OTHER';
}

export function getCurrencyForCountry(country?: string | null): CurrencyCode {
  switch (normalizeCountryCode(country)) {
    case 'AR':
      return 'ARS';
    case 'CL':
      return 'CLP';
    case 'PE':
      return 'PEN';
    default:
      return 'USD';
  }
}

export function getCountryFromLanguageHeader(header?: string | null): SupportedCountryCode {
  const language = header?.split(',')[0]?.toUpperCase() || '';

  if (language.includes('-AR')) return 'AR';
  if (language.includes('-CL')) return 'CL';
  if (language.includes('-PE')) return 'PE';
  if (language.includes('-US')) return 'US';

  return 'OTHER';
}

export function convertUsdAmount(amount: number, currency: CurrencyCode, rates = getExchangeRates()): number {
  if (currency === 'USD') return amount;
  return amount * rates[currency];
}

export function convertArsAmount(amount: number, currency: CurrencyCode, rates = getExchangeRates()): number {
  if (currency === 'ARS') return amount;

  const usdAmount = amount / rates.ARS;
  return convertUsdAmount(usdAmount, currency, rates);
}

export function formatCurrencyAmount(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(amount);
}

export function getTournamentEntryAmount(tournament: PriceSource, currency: CurrencyCode, rates = getExchangeRates()): number {
  return convertUsdAmount(Number(tournament.entry_fee_usd || 0), currency, rates);
}

export function getTournamentPrizePoolAmount(tournament: PriceSource, currency: CurrencyCode, rates = getExchangeRates()): number {
  return convertArsAmount(Number(tournament.prize_pool || 0), currency, rates);
}

export function buildTournamentCurrencyPreview(entryFeeUsd: number, rates = getExchangeRates()) {
  return {
    USD: convertUsdAmount(entryFeeUsd, 'USD', rates),
    ARS: Math.round(convertUsdAmount(entryFeeUsd, 'ARS', rates)),
    CLP: Math.round(convertUsdAmount(entryFeeUsd, 'CLP', rates)),
    PEN: Number(convertUsdAmount(entryFeeUsd, 'PEN', rates).toFixed(2)),
  };
}
