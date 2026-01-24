import { useQuery, useQueries } from '@tanstack/react-query';
import type { Asset, Currency } from '../types';
import {
  fetchAssetPrice,
  fetchAssetHistorical,
  convertCurrency,
  getMarketDataStatus,
} from './index';
import type {
  MarketDataResult,
  PriceData,
  HistoricalData,
} from './types';

const QUERY_KEYS = {
  assetPrice: (asset: Asset | null) => [
    'market-data',
    'price',
    asset?.id,
    asset?.ticker,
  ],
  assetHistorical: (asset: Asset | null, days: number) => [
    'market-data',
    'historical',
    asset?.id,
    asset?.ticker,
    days,
  ],
  fxRate: (from: Currency, to: Currency) => ['market-data', 'fx', from, to],
  status: ['market-data', 'status'],
};

// ============================================
// Price Hooks
// ============================================

export function useAssetPrice(asset: Asset | null) {
  return useQuery<MarketDataResult<PriceData>>({
    queryKey: QUERY_KEYS.assetPrice(asset),
    queryFn: async () => {
      if (!asset) throw new Error('No asset provided');
      return fetchAssetPrice(asset);
    },
    enabled: asset !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

export function useAssetPrices(assets: Asset[]) {
  const queries = assets.map((asset) => ({
    queryKey: QUERY_KEYS.assetPrice(asset),
    queryFn: () => fetchAssetPrice(asset),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  }));

  return useQueries({ queries });
}

// ============================================
// Historical Data Hooks
// ============================================

export function useAssetHistorical(asset: Asset | null, days: number = 365) {
  return useQuery<MarketDataResult<HistoricalData>>({
    queryKey: QUERY_KEYS.assetHistorical(asset, days),
    queryFn: async () => {
      if (!asset) throw new Error('No asset provided');
      return fetchAssetHistorical(asset, days);
    },
    enabled: asset !== null,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1,
  });
}

// ============================================
// Currency Conversion Hooks
// ============================================

export function useFXRate(from: Currency, to: Currency) {
  return useQuery({
    queryKey: QUERY_KEYS.fxRate(from, to),
    queryFn: () => convertCurrency(1, from, to),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: from !== to,
    retry: 1,
  });
}

export function useConvertCurrency(
  amount: number,
  from: Currency,
  to: Currency
) {
  const fxResult = useFXRate(from, to);

  return {
    ...fxResult,
    data: fxResult.data?.ok ? fxResult.data.data.amount : null,
    rate: fxResult.data?.ok ? fxResult.data.data.rate : null,
  };
}

// ============================================
// Service Status Hook
// ============================================

export function useMarketDataStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.status,
    queryFn: () => getMarketDataStatus(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to check if price data is fresh or stale
 */
export function usePriceFreshness(asset: Asset | null) {
  const result = useAssetPrice(asset);

  if (!result.data?.ok) {
    return { isFresh: false, provider: null, error: result.data };
  }

  const { status, provider } = result.data.data;
  const isFresh = status === 'fresh';

  return { isFresh, provider, status };
}

/**
 * Hook to get display-ready price data with fallback
 */
export function usePriceDisplay(asset: Asset | null) {
  const result = useAssetPrice(asset);

  if (!result.data?.ok) {
    return {
      price: asset?.currentPrice || 0,
      timestamp: asset?.lastUpdated || new Date().toISOString(),
      provider: 'manual' as const,
      isFresh: false,
      error: result.data?.reason,
    };
  }

  const { price, timestamp, provider, status } = result.data.data;

  return {
    price,
    timestamp,
    provider,
    isFresh: status === 'fresh',
    error: null,
  };
}

/**
 * Hook to batch fetch prices for portfolio
 */
export function usePortfolioPrices(assets: Asset[]) {
  const priceQueries = useAssetPrices(assets);

  const data = priceQueries.map((query, idx) => ({
    assetId: assets[idx].id,
    result: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }));

  const isLoading = priceQueries.some((q) => q.isLoading);
  const hasError = priceQueries.some((q) => q.error);

  return { data, isLoading, hasError };
}
