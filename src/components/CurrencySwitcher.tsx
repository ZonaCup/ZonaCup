'use client';

import { useCurrency } from '@/components/CurrencyProvider';

export default function CurrencySwitcher() {
  const { currency, detectedCurrency, selectionMode, setCurrency, resetCurrency, options } = useCurrency();

  return (
    <label className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/20 px-2.5 py-1.5">
      <span className="hidden text-[10px] uppercase tracking-[0.18em] text-ash sm:inline">
        Moneda
      </span>
      <select
        value={selectionMode === 'auto' ? 'AUTO' : currency}
        onChange={(e) => {
          if (e.target.value === 'AUTO') {
            resetCurrency();
            return;
          }

          setCurrency(e.target.value as typeof currency);
        }}
        className="bg-transparent text-[11px] font-semibold uppercase tracking-[0.16em] text-ivory outline-none"
        aria-label="Cambiar moneda"
      >
        <option value="AUTO" className="bg-bg-deep text-ivory">
          Auto ({detectedCurrency})
        </option>
        {options.map((option) => (
          <option key={option.code} value={option.code} className="bg-bg-deep text-ivory">
            {option.label}
            {option.code === detectedCurrency ? ' · Detectada' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
