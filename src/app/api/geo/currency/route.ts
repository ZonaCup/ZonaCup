import { NextRequest, NextResponse } from 'next/server';
import { fetchExchangeRates, getCountryFromLanguageHeader, getCurrencyForCountry, normalizeCountryCode } from '@/lib/currency';

export async function GET(request: NextRequest) {
  const ipCountry = normalizeCountryCode(request.headers.get('x-vercel-ip-country'));
  const languageCountry = getCountryFromLanguageHeader(request.headers.get('accept-language'));
  const country = ipCountry !== 'OTHER' ? ipCountry : languageCountry;
  const currency = getCurrencyForCountry(country);
  const exchange = await fetchExchangeRates();

  return NextResponse.json({
    country,
    currency,
    rates: exchange.rates,
    ratesProvider: exchange.provider,
    ratesUpdatedAt: exchange.updatedAt,
    source: ipCountry !== 'OTHER' ? 'ip' : languageCountry !== 'OTHER' ? 'language' : 'default',
  });
}
