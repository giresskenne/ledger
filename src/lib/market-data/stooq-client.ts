import { Platform } from 'react-native';
import type {
  MarketDataResult,
  PriceData,
  HistoricalData,
  HistoricalPrice,
} from './types';
import {
  getCachedData,
  setCachedData,
  getStaleCachedData,
} from './cache';

// Stooq provides free EOD data for global stocks
// URL format: https://stooq.com/q/d/l/?s=AAPL.US&f=sd2t2ohlcv&h&e=csv
// NOTE: Stooq doesn't support CORS, so this only works on native (iOS/Android)

const STOOQ_BASE_URL = 'https://stooq.com/q/d/l/';

// Check if we're running on web (where CORS will block requests)
const isWeb = Platform.OS === 'web';

// Stooq country suffixes
const STOOQ_SUFFIXES: Record<string, string> = {
  US: '.US',
  UK: '.UK',
  DE: '.DE',
  FR: '.FR',
  JP: '.JP',
  CA: '.CA', // Not all Canadian stocks available
  AU: '.AU',
  CH: '.CH',
  BR: '.BR',
  // ETFs often don't need suffix if US-based
};

// Rate limiting - Stooq doesn't publish limits, be conservative
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  return fetch(url);
}

function parseCSVLine(line: string): string[] {
  return line.split(',').map((v) => v.trim());
}

function parseStooqCSV(csv: string): HistoricalPrice[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Header: Date,Open,High,Low,Close,Volume (NO Time column in this format)
  const prices: HistoricalPrice[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) continue;

    const [date, open, high, low, close, volume] = values;

    // Skip if we got "No data" or invalid values
    if (!date || date === 'No data' || isNaN(parseFloat(close))) continue;

    prices.push({
      date,
      open: parseFloat(open) || 0,
      high: parseFloat(high) || 0,
      low: parseFloat(low) || 0,
      close: parseFloat(close),
      volume: volume ? parseInt(volume, 10) : undefined,
    });
  }

  // Stooq returns data sorted oldest first, so we need to reverse to get newest first
  return prices.reverse();
}

function getStooqSymbol(ticker: string, country?: string): string {
  // If ticker already has a suffix, use as-is
  if (ticker.includes('.')) return ticker.toUpperCase();

  // Allow “raw” symbols (fx/commodities) without suffix, e.g. XAUUSD, EURUSD, BTCUSD.
  // Stooq uses these without a country suffix.
  if (/^[A-Z]{3,6}[A-Z]{3}$/.test(ticker.toUpperCase())) {
    return ticker.toLowerCase();
  }

  // Add country suffix if provided
  const suffix = country ? STOOQ_SUFFIXES[country] || '' : '.US';
  return `${ticker.toUpperCase()}${suffix}`;
}

export async function fetchStooqQuote(
  ticker: string,
  country?: string
): Promise<MarketDataResult<PriceData>> {
  const symbol = getStooqSymbol(ticker, country);

  // Check cache first
  const cached = await getCachedData<PriceData>('quote', symbol);
  if (cached) {
    return { ok: true, data: cached };
  }

  // Stooq doesn't support CORS - skip API call on web
  if (isWeb) {
    console.log('[Stooq] Web platform detected - CORS not supported, using manual fallback');
    const stale = await getStaleCachedData<PriceData>('quote', symbol);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }
    return { ok: false, reason: 'Stooq API not available on web (CORS). Use mobile app for live prices.' };
  }

  try {
    // Fetch latest data point
    // Use f=d2ohlcv: date, open, high, low, close, volume (no symbol/time columns)
    const url = `${STOOQ_BASE_URL}?s=${symbol}&f=d2ohlcv&h&e=csv`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      // Try stale cache
      const stale = await getStaleCachedData<PriceData>('quote', symbol);
      if (stale) {
        return {
          ok: true,
          data: { ...stale.data, status: 'stale' },
        };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const csv = await response.text();

    // Check for "No data" response
    if (csv.includes('No data') || csv.trim().split('\n').length < 2) {
      const stale = await getStaleCachedData<PriceData>('quote', symbol);
      if (stale) {
        return {
          ok: true,
          data: { ...stale.data, status: 'stale' },
        };
      }
      return { ok: false, reason: 'No data available for this symbol' };
    }

    const prices = parseStooqCSV(csv);
    if (prices.length === 0) {
      return { ok: false, reason: 'Could not parse price data' };
    }

    // Get latest price
    const latest = prices[0];
    const previous = prices[1];

    const priceData: PriceData = {
      symbol: ticker.toUpperCase(),
      price: latest.close,
      previousClose: previous?.close,
      change: previous ? latest.close - previous.close : undefined,
      changePercent: previous
        ? ((latest.close - previous.close) / previous.close) * 100
        : undefined,
      volume: latest.volume,
      timestamp: new Date().toISOString(),
      provider: 'stooq',
      status: 'fresh',
      currency: 'USD', // Stooq returns in local currency, assume USD for US stocks
    };

    // Cache the result
    await setCachedData('quote', symbol, priceData, 'quote');

    return { ok: true, data: priceData };
  } catch (error) {
    console.error('[Stooq] Fetch error:', error);

    // Fallback to stale cache
    const stale = await getStaleCachedData<PriceData>('quote', symbol);
    if (stale) {
      return {
        ok: true,
        data: { ...stale.data, status: 'stale' },
      };
    }

    return {
      ok: false,
      reason: 'Network error fetching stock data',
      error,
    };
  }
}

export async function fetchStooqHistorical(
  ticker: string,
  country?: string,
  days: number = 365
): Promise<MarketDataResult<HistoricalData>> {
  const symbol = getStooqSymbol(ticker, country);

  // Check cache first
  const cached = await getCachedData<HistoricalData>('historical', symbol);
  if (cached) {
    return { ok: true, data: cached };
  }

  // Stooq doesn't support CORS - skip API call on web
  if (isWeb) {
    const stale = await getStaleCachedData<HistoricalData>('historical', symbol);
    if (stale) {
      return { ok: true, data: stale.data };
    }
    return { ok: false, reason: 'Stooq API not available on web (CORS)' };
  }

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (d: Date) =>
      d.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${STOOQ_BASE_URL}?s=${symbol}&d1=${formatDate(startDate)}&d2=${formatDate(endDate)}&f=d2ohlcv&h&e=csv`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<HistoricalData>('historical', symbol);
      if (stale) {
        return { ok: true, data: stale.data };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const csv = await response.text();
    const prices = parseStooqCSV(csv);

    if (prices.length === 0) {
      const stale = await getStaleCachedData<HistoricalData>('historical', symbol);
      if (stale) {
        return { ok: true, data: stale.data };
      }
      return { ok: false, reason: 'No historical data available' };
    }

    const historicalData: HistoricalData = {
      symbol: ticker.toUpperCase(),
      // Already reversed in parseStooqCSV, reverse again to get chronological for charts
      prices: prices.slice().reverse(),
      provider: 'stooq',
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 24 hours
    await setCachedData('historical', symbol, historicalData, 'historical');

    return { ok: true, data: historicalData };
  } catch (error) {
    console.error('[Stooq] Historical fetch error:', error);

    const stale = await getStaleCachedData<HistoricalData>('historical', symbol);
    if (stale) {
      return { ok: true, data: stale.data };
    }

    return {
      ok: false,
      reason: 'Network error fetching historical data',
      error,
    };
  }
}

/**
 * Fetch a quote for a “raw” Stooq symbol (fx/commodities), e.g. xauusd or eurusd.
 * This bypasses country suffix logic.
 */
export async function fetchStooqRawQuote(
  rawSymbol: string
): Promise<MarketDataResult<PriceData>> {
  const symbol = rawSymbol.toLowerCase();
  const cacheKey = `RAW_${symbol}`;

  const cached = await getCachedData<PriceData>('quote', cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  if (isWeb) {
    const stale = await getStaleCachedData<PriceData>('quote', cacheKey);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }
    return { ok: false, reason: 'Stooq API not available on web (CORS). Use mobile app for live prices.' };
  }

  try {
    const url = `${STOOQ_BASE_URL}?s=${symbol}&f=d2ohlcv&h&e=csv`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<PriceData>('quote', cacheKey);
      if (stale) {
        return { ok: true, data: { ...stale.data, status: 'stale' } };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const csv = await response.text();
    if (csv.includes('No data') || csv.trim().split('\n').length < 2) {
      const stale = await getStaleCachedData<PriceData>('quote', cacheKey);
      if (stale) {
        return { ok: true, data: { ...stale.data, status: 'stale' } };
      }
      return { ok: false, reason: 'No data available for this symbol' };
    }

    const prices = parseStooqCSV(csv);
    if (prices.length === 0) return { ok: false, reason: 'Could not parse price data' };

    const latest = prices[0];
    const previous = prices[1];

    const priceData: PriceData = {
      symbol: rawSymbol.toUpperCase(),
      price: latest.close,
      previousClose: previous?.close,
      change: previous ? latest.close - previous.close : undefined,
      changePercent: previous ? ((latest.close - previous.close) / previous.close) * 100 : undefined,
      volume: latest.volume,
      timestamp: new Date().toISOString(),
      provider: 'stooq',
      status: 'fresh',
      currency: 'USD',
    };

    await setCachedData('quote', cacheKey, priceData, 'quote');
    return { ok: true, data: priceData };
  } catch (error) {
    console.error('[Stooq] Raw quote fetch error:', error);
    const stale = await getStaleCachedData<PriceData>('quote', cacheKey);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }
    return { ok: false, reason: 'Network error fetching symbol', error };
  }
}

export async function fetchStooqRawHistorical(
  rawSymbol: string,
  days: number = 365
): Promise<MarketDataResult<HistoricalData>> {
  const symbol = rawSymbol.toLowerCase();
  const cacheKey = `RAW_${symbol}_${days}`;

  const cached = await getCachedData<HistoricalData>('historical', cacheKey);
  if (cached) return { ok: true, data: cached };

  if (isWeb) {
    const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
    if (stale) {
      return { ok: true, data: stale.data };
    }
    return { ok: false, reason: 'Stooq API not available on web (CORS)' };
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const url = `${STOOQ_BASE_URL}?s=${symbol}&d1=${formatDate(startDate)}&d2=${formatDate(endDate)}&f=d2ohlcv&h&e=csv`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
      if (stale) return { ok: true, data: stale.data };
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const csv = await response.text();
    const prices = parseStooqCSV(csv);
    if (prices.length === 0) {
      const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
      if (stale) return { ok: true, data: stale.data };
      return { ok: false, reason: 'No historical data available' };
    }

    const historicalData: HistoricalData = {
      symbol: rawSymbol.toUpperCase(),
      prices: prices.slice().reverse(),
      provider: 'stooq',
      lastUpdated: new Date().toISOString(),
    };

    await setCachedData('historical', cacheKey, historicalData, 'historical');
    return { ok: true, data: historicalData };
  } catch (error) {
    console.error('[Stooq] Raw historical fetch error:', error);
    const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
    if (stale) return { ok: true, data: stale.data };
    return { ok: false, reason: 'Network error fetching historical data', error };
  }
}

// Check if a symbol is supported by Stooq
export async function checkStooqSymbol(
  ticker: string,
  country?: string
): Promise<boolean> {
  const result = await fetchStooqQuote(ticker, country);
  return result.ok;
}

// Supported countries for stock data
export const STOOQ_SUPPORTED_COUNTRIES = Object.keys(STOOQ_SUFFIXES);
