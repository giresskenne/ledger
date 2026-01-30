// Portfolio FX helpers
// Provides base-currency conversions using the existing Alpha Vantage FX endpoint.

import { useQueries } from '@tanstack/react-query';
import type { Asset, Currency } from '@/lib/types';
import { convertCurrency } from '@/lib/market-data';

type FXRateMap = Record<string, number | null>;

export function usePortfolioFXRates(assets: Asset[], baseCurrency: Currency) {
  const fromCurrencies = Array.from(
    new Set(
      assets
        .map((a) => a.currency)
        .filter((c): c is Currency => !!c && c !== baseCurrency)
    )
  );

  const queries = useQueries({
    queries: fromCurrencies.map((from) => ({
      queryKey: ['market-data', 'fx', from, baseCurrency],
      queryFn: () => convertCurrency(1, from, baseCurrency),
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 1,
      enabled: from !== baseCurrency,
    })),
  });

  const rates: FXRateMap = {};
  const missing: Currency[] = [];

  fromCurrencies.forEach((from, idx) => {
    const q = queries[idx];
    const result = q.data;
    if (result?.ok) {
      rates[from] = result.data.rate;
    } else {
      rates[from] = null;
      if (q.isFetched) missing.push(from);
    }
  });

  const isLoading = queries.some((q) => q.isLoading);
  const hasAnyConversions = fromCurrencies.length > 0;

  const convert = (amount: number, from: Currency) => {
    if (from === baseCurrency) return amount;
    const rate = rates[from];
    if (!rate) return amount; // fallback to raw if missing
    return amount * rate;
  };

  return {
    baseCurrency,
    isLoading,
    hasAnyConversions,
    missingCurrencies: missing,
    rates,
    convert,
  };
}

