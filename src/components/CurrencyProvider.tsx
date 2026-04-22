'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CurrencyCode, SUPPORTED_CURRENCIES, getCountryFromLanguageHeader, getCurrencyForCountry } from '@/lib/currency';

type CurrencyContextValue = {
  currency: CurrencyCode;
  country: string;
  detectedCurrency: CurrencyCode;
  selectionMode: 'auto' | 'manual';
  setCurrency: (currency: CurrencyCode) => void;
  resetCurrency: () => void;
  options: typeof SUPPORTED_CURRENCIES;
};

const STORAGE_KEY = 'zona-cup.currency';

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isCurrencyCode(value: string | null): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((option) => option.code === value);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState('OTHER');
  const [detectedCurrency, setDetectedCurrency] = useState<CurrencyCode>('USD');
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual'>('auto');

  useEffect(() => {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);
    const saved = isCurrencyCode(savedValue) ? savedValue : null;

    async function loadCurrencyContext() {
      try {
        const response = await fetch('/api/geo/currency', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load geo currency');
        const payload = await response.json();
        const nextCountry = payload.country || 'OTHER';
        const nextDetectedCurrency = payload.currency || getCurrencyForCountry(nextCountry);

        setCountry(nextCountry);
        setDetectedCurrency(nextDetectedCurrency);
        setSelectionMode(saved ? 'manual' : 'auto');
        setCurrencyState(saved ?? nextDetectedCurrency);
      } catch {
        const fallbackDetectedCurrency = getCurrencyForCountry(
          getCountryFromLanguageHeader(typeof navigator !== 'undefined' ? navigator.language : null)
        );
        setDetectedCurrency(fallbackDetectedCurrency);
        setSelectionMode(saved ? 'manual' : 'auto');
        setCurrencyState(saved ?? fallbackDetectedCurrency);
      }
    }

    void loadCurrencyContext();
  }, []);

  function setCurrency(nextCurrency: CurrencyCode) {
    window.localStorage.setItem(STORAGE_KEY, nextCurrency);
    setSelectionMode('manual');
    setCurrencyState(nextCurrency);
  }

  function resetCurrency() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSelectionMode('auto');
    setCurrencyState(detectedCurrency);
  }

  const value = useMemo<CurrencyContextValue>(() => ({
    currency,
    country,
    detectedCurrency,
    selectionMode,
    setCurrency,
    resetCurrency,
    options: SUPPORTED_CURRENCIES,
  }), [country, currency, detectedCurrency, selectionMode]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}
