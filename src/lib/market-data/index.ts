import type { Asset, AssetCategory, Currency } from '../types';
import type {
  MarketDataResult,
  PriceData,
  HistoricalData,
  HistoricalPrice,
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
  fetchCompanyOverview,
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
  sector?: string;
  currentPrice?: number;
  currency: Currency;
}

async function fetchSectorFromAlphaVantage(ticker: string): Promise<string | undefined> {
  if (!isAlphaVantageConfigured() || getAlphaVantageRemainingCalls() <= 0) {
    return undefined;
  }

  const overview = await fetchCompanyOverview(ticker);
  if (!overview.ok) {
    return undefined;
  }

  return overview.data.sector;
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
          const sector = await fetchSectorFromAlphaVantage(ticker);
          return {
            ok: true,
            data: {
              ticker: ticker.toUpperCase(),
              name: ticker.toUpperCase(), // Stooq doesn't provide company names
              category,
              sector,
              currentPrice: result.data.price,
              currency: (result.data.currency as Currency) || currency,
            },
          };
        }

        // Fallback to Alpha Vantage if Stooq fails and AV is configured
        if (isAlphaVantageConfigured() && getAlphaVantageRemainingCalls() > 0) {
          const avResult = await fetchAlphaVantageStockQuote(ticker);
          if (avResult.ok) {
            const sector = await fetchSectorFromAlphaVantage(ticker);
            return {
              ok: true,
              data: {
                ticker: ticker.toUpperCase(),
                name: ticker.toUpperCase(),
                category,
                sector,
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

/**
 * Get the closing price of a ticker on a specific date (or nearest prior trading day).
 * Useful for auto-filling purchase price when user picks a past purchase date.
 */
export async function getPriceOnDate(
  ticker: string,
  date: Date,
  category: AssetCategory,
  country?: string,
  currency: Currency = 'USD'
): Promise<MarketDataResult<{ price: number; date: string }>> {
  const strategy = getProviderForCategory(category);

  // Only supported for tickers with a data provider
  if (strategy === 'manual') {
    return { ok: false, reason: 'Historical pricing not available for this asset type' };
  }

  // Calculate how many days ago the target date is (add buffer for weekends/holidays)
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { ok: false, reason: 'Cannot fetch future prices' };
  }
  // Fetch enough history to cover the date + buffer for non-trading days
  const daysToFetch = Math.max(diffDays + 10, 30);

  let historicalResult: MarketDataResult<HistoricalData>;

  switch (strategy) {
    case 'stooq':
      historicalResult = await fetchStooqHistorical(ticker, country, daysToFetch);
      break;
    case 'stooq_raw':
      historicalResult = await fetchStooqRawHistorical(ticker, daysToFetch);
      break;
    case 'alphavantage_crypto':
      historicalResult = await fetchCryptoHistorical(ticker, currency, daysToFetch);
      break;
    default:
      return { ok: false, reason: 'No provider available' };
  }

  if (!historicalResult.ok) {
    return { ok: false, reason: historicalResult.reason };
  }

  const prices = historicalResult.data.prices;
  if (!prices || prices.length === 0) {
    return { ok: false, reason: 'No historical data available' };
  }

  // Target date string (YYYY-MM-DD)
  const targetDateStr = date.toISOString().slice(0, 10);

  // Find exact match first
  const exactMatch = prices.find((p) => p.date === targetDateStr);
  if (exactMatch) {
    return { ok: true, data: { price: exactMatch.close, date: exactMatch.date } };
  }

  // Find closest prior trading day (the last trading day <= target date)
  const targetTime = date.getTime();
  let closest: HistoricalPrice | null = null;
  let closestDiff = Infinity;

  for (const p of prices) {
    const pTime = new Date(p.date).getTime();
    const diff = targetTime - pTime;
    // Only consider dates on or before the target
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff;
      closest = p;
    }
  }

  // If no prior date found, take the earliest available date after target
  if (!closest) {
    let earliestAfter: HistoricalPrice | null = null;
    let earliestDiff = Infinity;
    for (const p of prices) {
      const pTime = new Date(p.date).getTime();
      const diff = pTime - targetTime;
      if (diff >= 0 && diff < earliestDiff) {
        earliestDiff = diff;
        earliestAfter = p;
      }
    }
    if (earliestAfter) {
      return { ok: true, data: { price: earliestAfter.close, date: earliestAfter.date } };
    }
    return { ok: false, reason: 'No price data found near this date' };
  }

  return { ok: true, data: { price: closest.close, date: closest.date } };
}

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
