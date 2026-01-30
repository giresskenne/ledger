import type { Asset, AssetCategory, Currency } from '../types';
import type {
  MarketDataResult,
  PriceData,
  HistoricalData,
  FXRate,
  MarketDataProvider,
} from './types';
import {
  fetchStooqQuote,
  fetchStooqHistorical,
  fetchStooqRawQuote,
  fetchStooqRawHistorical,
  STOOQ_SUPPORTED_COUNTRIES,
} from './stooq-client';
import {
  fetchFXRate,
  fetchCryptoQuote,
  fetchCryptoHistorical,
  fetchStockQuote as fetchAlphaVantageStockQuote,
  isAlphaVantageConfigured,
  getAlphaVantageRemainingCalls,
  SUPPORTED_CRYPTO_SYMBOLS,
} from './alphavantage-client';
import { getCachedData, setCachedData, clearCache, getCacheStats } from './cache';

// ============================================
// Ticker Search and Price Lookup
// ============================================

export interface TickerSearchResult {
  ticker: string;
  name: string;
  category: AssetCategory;
  currentPrice?: number;
  currency: Currency;
}

/**
 * Search for a ticker and fetch its current price
 * This is useful for the add-asset flow
 */
export async function searchTicker(
  ticker: string,
  category: AssetCategory = 'stocks',
  country?: string,
  currency: Currency = 'USD'
): Promise<MarketDataResult<TickerSearchResult>> {
  const strategy = getProviderForCategory(category);

  switch (strategy) {
    case 'stooq':
      if (ticker) {
        const result = await fetchStooqQuote(ticker, country);
        if (result.ok) {
          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              name: ticker.toUpperCase(), // Stooq doesn't provide company names
              category,
              currentPrice: result.data.price,
              currency: (result.data.currency as Currency) || currency,
            },
          };
        }

        // Fallback to Alpha Vantage if Stooq fails and AV is configured
        if (isAlphaVantageConfigured() && getAlphaVantageRemainingCalls() > 0) {
          const avResult = await fetchAlphaVantageStockQuote(ticker);
          if (avResult.ok) {
            return {
              ok: true,
              data: {
                ticker: ticker.toUpperCase(),
                name: ticker.toUpperCase(),
                category,
                currentPrice: avResult.data.price,
                currency: (avResult.data.currency as Currency) || currency,
              },
            };
          }
        }
      }
      return {
        ok: false,
        reason: 'Unable to find price data for this ticker',
      };

    case 'stooq_raw':
      if (ticker) {
        const result = await fetchStooqRawQuote(ticker);
        if (result.ok) {
          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              name: ticker.toUpperCase(),
              category,
              currentPrice: result.data.price,
              currency: (result.data.currency as Currency) || currency,
            },
          };
        }
      }
      return { ok: false, reason: 'Unable to find price data for this symbol' };

    case 'alphavantage_crypto':
      if (ticker) {
        const result = await fetchCryptoQuote(ticker, currency);
        if (result.ok) {
          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              name: `${ticker.toUpperCase()} (Crypto)`,
              category: 'crypto',
              currentPrice: result.data.price,
              currency: (result.data.currency as Currency) || currency,
            },
          };
        }
      }
      return {
        ok: false,
        reason: 'Unable to find price data for this cryptocurrency',
      };

    case 'manual':
    default:
      return {
        ok: false,
        reason: 'This asset category requires manual entry',
      };
  }
}

// ============================================
// Asset Category to Provider Mapping
// ============================================

type ProviderStrategy =
  | 'stooq'
  | 'stooq_raw'
  | 'alphavantage_fx'
  | 'alphavantage_crypto'
  | 'manual';

function getProviderForCategory(category: AssetCategory): ProviderStrategy {
  switch (category) {
    case 'stocks':
    case 'funds':
      return 'stooq';
    case 'crypto':
      return 'alphavantage_crypto';
    // Spot symbols (e.g. XAUUSD / XAGUSD) can be fetched from Stooq without suffix
    case 'gold':
    case 'physical_metals':
      return 'stooq_raw';
    // These need manual entry or specialized APIs
    case 'bonds':
    case 'fixed_income':
    case 'real_estate':
    case 'derivatives':
    case 'cash':
    default:
      return 'manual';
  }
}

// ============================================
// Unified Price Fetching
// ============================================

export async function fetchAssetPrice(
  asset: Asset
): Promise<MarketDataResult<PriceData>> {
  const strategy = getProviderForCategory(asset.category);

  switch (strategy) {
    case 'stooq':
      if (asset.ticker) {
        const result = await fetchStooqQuote(asset.ticker, asset.country);
        if (result.ok) return result;

        // Fallback to Alpha Vantage if Stooq fails and AV is configured
        if (isAlphaVantageConfigured() && getAlphaVantageRemainingCalls() > 0) {
          return fetchAlphaVantageStockQuote(asset.ticker);
        }
      }
      // Fallback to manual
      return createManualPriceData(asset);

    case 'stooq_raw':
      if (asset.ticker) {
        const result = await fetchStooqRawQuote(asset.ticker);
        if (result.ok) return result;
      }
      return createManualPriceData(asset);

    case 'alphavantage_crypto':
      if (asset.ticker) {
        const result = await fetchCryptoQuote(asset.ticker, asset.currency);
        if (result.ok) return result;
      }
      return createManualPriceData(asset);

    case 'alphavantage_fx':
      // FX rates are handled separately
      return createManualPriceData(asset);

    case 'manual':
    default:
      return createManualPriceData(asset);
  }
}

function createManualPriceData(asset: Asset): MarketDataResult<PriceData> {
  return {
    ok: true,
    data: {
      symbol: asset.ticker || asset.name,
      price: asset.currentPrice,
      timestamp: asset.lastUpdated,
      provider: 'manual',
      status: 'manual',
      currency: asset.currency,
    },
  };
}

// ============================================
// Historical Data
// ============================================

export async function fetchAssetHistorical(
  asset: Asset,
  days: number = 365
): Promise<MarketDataResult<HistoricalData>> {
  const strategy = getProviderForCategory(asset.category);

  if (strategy === 'stooq' && asset.ticker) {
    const result = await fetchStooqHistorical(asset.ticker, asset.country, days);
    if (result.ok) return result;
  }

  if (strategy === 'stooq_raw' && asset.ticker) {
    const result = await fetchStooqRawHistorical(asset.ticker, days);
    if (result.ok) return result;
  }

  if (strategy === 'alphavantage_crypto' && asset.ticker) {
    const result = await fetchCryptoHistorical(asset.ticker, asset.currency, days);
    if (result.ok) return result;
  }

  // Fallback to valueHistory if available
  if (asset.valueHistory && asset.valueHistory.length > 0) {
    return {
      ok: true,
      data: {
        symbol: asset.ticker || asset.name,
        prices: asset.valueHistory.map((vh) => ({
          date: vh.date,
          open: vh.value,
          high: vh.value,
          low: vh.value,
          close: vh.value,
        })),
        provider: 'manual',
        lastUpdated: asset.lastUpdated,
      },
    };
  }

  return {
    ok: false,
    reason: 'No historical data available',
  };
}

// ============================================
// Currency Conversion
// ============================================

export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): Promise<MarketDataResult<{ amount: number; rate: number }>> {
  if (from === to) {
    return { ok: true, data: { amount, rate: 1 } };
  }

  const result = await fetchFXRate(from, to);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: {
      amount: amount * result.data.rate,
      rate: result.data.rate,
    },
  };
}

// ============================================
// Batch Operations
// ============================================

export interface BatchPriceResult {
  assetId: string;
  result: MarketDataResult<PriceData>;
}

export async function fetchBatchPrices(
  assets: Asset[]
): Promise<BatchPriceResult[]> {
  // Group by provider to minimize API calls
  const results: BatchPriceResult[] = [];

  // Process sequentially to respect rate limits
  for (const asset of assets) {
    const result = await fetchAssetPrice(asset);
    results.push({ assetId: asset.id, result });

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

// ============================================
// Service Status
// ============================================

export interface MarketDataStatus {
  stooq: {
    available: boolean;
    supportedCountries: string[];
  };
  alphavantage: {
    configured: boolean;
    remainingCalls: number;
    supportedCrypto: string[];
  };
  cache: {
    totalItems: number;
    freshItems: number;
    staleItems: number;
  };
}

export async function getMarketDataStatus(): Promise<MarketDataStatus> {
  const cacheStats = await getCacheStats();

  return {
    stooq: {
      available: true, // Stooq doesn't require API key
      supportedCountries: STOOQ_SUPPORTED_COUNTRIES,
    },
    alphavantage: {
      configured: isAlphaVantageConfigured(),
      remainingCalls: getAlphaVantageRemainingCalls(),
      supportedCrypto: SUPPORTED_CRYPTO_SYMBOLS,
    },
    cache: {
      totalItems: cacheStats.totalItems,
      freshItems: cacheStats.freshItems,
      staleItems: cacheStats.staleItems,
    },
  };
}

// ============================================
// Cache Management
// ============================================

export { clearCache, getCacheStats };

// ============================================
// Re-exports
// ============================================

export { DATA_ATTRIBUTIONS } from './types';
export type { PriceData, HistoricalData, FXRate, MarketDataProvider } from './types';
