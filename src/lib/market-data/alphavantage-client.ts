import type {
  MarketDataResult,
  PriceData,
  FXRate,
  HistoricalData,
  HistoricalPrice,
  AlphaVantageQuote,
  AlphaVantageFXRate,
} from './types';
import {
  getCachedData,
  setCachedData,
  getStaleCachedData,
} from './cache';

// Alpha Vantage API for FX and crypto
// Free tier: 25 requests/day
// Docs: https://www.alphavantage.co/documentation/

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// API key from environment - user must set this in ENV tab
function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_ALPHAVANTAGE_API_KEY as string | undefined;
  return key || null;
}

// Rate limiting for free tier
let requestCount = 0;
let lastResetTime = Date.now();
const MAX_REQUESTS_PER_DAY = 25;
const MIN_REQUEST_INTERVAL = 12000; // 12 seconds minimum between requests
let lastRequestTime = 0;

function checkRateLimit(): boolean {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  // Reset counter daily
  if (now - lastResetTime > dayInMs) {
    requestCount = 0;
    lastResetTime = now;
  }

  return requestCount < MAX_REQUESTS_PER_DAY;
}

async function rateLimitedFetch(url: string): Promise<Response> {
  if (!checkRateLimit()) {
    throw new Error('Alpha Vantage daily limit reached (25 requests)');
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  requestCount++;
  return fetch(url);
}

// ============================================
// FX Rates
// ============================================

export async function fetchFXRate(
  fromCurrency: string,
  toCurrency: string
): Promise<MarketDataResult<FXRate>> {
  const cacheKey = `${fromCurrency}_${toCurrency}`;

  // Check cache first (FX rates cached for 1 hour)
  const cached = await getCachedData<FXRate>('fx', cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    // Return stale or error
    const stale = await getStaleCachedData<FXRate>('fx', cacheKey);
    if (stale) {
      return { ok: true, data: stale.data };
    }
    return {
      ok: false,
      reason: 'Alpha Vantage API key not configured. Add EXPO_PUBLIC_ALPHAVANTAGE_API_KEY in ENV tab.',
    };
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<FXRate>('fx', cacheKey);
      if (stale) {
        return { ok: true, data: stale.data };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const data = await response.json();

    // Check for API errors
    if (data['Error Message']) {
      return { ok: false, reason: data['Error Message'] };
    }

    if (data['Note']) {
      // Rate limit message
      const stale = await getStaleCachedData<FXRate>('fx', cacheKey);
      if (stale) {
        return { ok: true, data: stale.data };
      }
      return { ok: false, reason: 'API rate limit reached' };
    }

    const rateData = data['Realtime Currency Exchange Rate'] as AlphaVantageFXRate;
    if (!rateData) {
      return { ok: false, reason: 'Invalid API response' };
    }

    const fxRate: FXRate = {
      from: rateData['1. From_Currency Code'],
      to: rateData['3. To_Currency Code'],
      rate: parseFloat(rateData['5. Exchange Rate']),
      timestamp: rateData['6. Last Refreshed'],
      provider: 'alphavantage',
    };

    // Cache for 1 hour
    await setCachedData('fx', cacheKey, fxRate, 'fx');

    return { ok: true, data: fxRate };
  } catch (error) {
    console.error('[AlphaVantage] FX fetch error:', error);

    const stale = await getStaleCachedData<FXRate>('fx', cacheKey);
    if (stale) {
      return { ok: true, data: stale.data };
    }

    return {
      ok: false,
      reason: 'Network error fetching FX rate',
      error,
    };
  }
}

// ============================================
// Crypto Quotes
// ============================================

const CRYPTO_SYMBOLS: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  XRP: 'Ripple',
  ADA: 'Cardano',
  DOT: 'Polkadot',
  MATIC: 'Polygon',
  LINK: 'Chainlink',
  AVAX: 'Avalanche',
};

export async function fetchCryptoQuote(
  symbol: string,
  market: string = 'USD'
): Promise<MarketDataResult<PriceData>> {
  const cacheKey = `${symbol}_${market}`;

  // Check cache first (crypto cached for 5 minutes)
  const cached = await getCachedData<PriceData>('crypto', cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const stale = await getStaleCachedData<PriceData>('crypto', cacheKey);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }
    return {
      ok: false,
      reason: 'Alpha Vantage API key not configured. Add EXPO_PUBLIC_ALPHAVANTAGE_API_KEY in ENV tab.',
    };
  }

  try {
    // Use CURRENCY_EXCHANGE_RATE for crypto too
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=${market}&apikey=${apiKey}`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<PriceData>('crypto', cacheKey);
      if (stale) {
        return { ok: true, data: { ...stale.data, status: 'stale' } };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      const stale = await getStaleCachedData<PriceData>('crypto', cacheKey);
      if (stale) {
        return { ok: true, data: { ...stale.data, status: 'stale' } };
      }
      return { ok: false, reason: data['Error Message'] || 'API rate limit reached' };
    }

    const rateData = data['Realtime Currency Exchange Rate'] as AlphaVantageFXRate;
    if (!rateData) {
      return { ok: false, reason: 'Invalid API response' };
    }

    const price = parseFloat(rateData['5. Exchange Rate']);
    const bid = parseFloat(rateData['8. Bid Price']);
    const ask = parseFloat(rateData['9. Ask Price']);

    const priceData: PriceData = {
      symbol: symbol.toUpperCase(),
      price,
      timestamp: rateData['6. Last Refreshed'],
      provider: 'alphavantage',
      status: 'fresh',
      currency: market,
    };

    // Cache for 5 minutes
    await setCachedData('crypto', cacheKey, priceData, 'crypto');

    return { ok: true, data: priceData };
  } catch (error) {
    console.error('[AlphaVantage] Crypto fetch error:', error);

    const stale = await getStaleCachedData<PriceData>('crypto', cacheKey);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }

    return {
      ok: false,
      reason: 'Network error fetching crypto price',
      error,
    };
  }
}

// ============================================
// Crypto Historical (Daily)
// ============================================

type AlphaVantageDigitalCurrencyDailyPoint = Record<string, string>;

type AlphaVantageDigitalCurrencyDailyResponse = {
  'Meta Data'?: Record<string, string>;
  'Time Series (Digital Currency Daily)'?: Record<string, AlphaVantageDigitalCurrencyDailyPoint>;
  Note?: string;
  'Error Message'?: string;
};

export async function fetchCryptoHistorical(
  symbol: string,
  market: string = 'USD',
  days: number = 365
): Promise<MarketDataResult<HistoricalData>> {
  const cacheKey = `CRYPTO_DAILY_${symbol}_${market}_${days}`;

  const cached = await getCachedData<HistoricalData>('historical', cacheKey);
  if (cached) return { ok: true, data: cached };

  const apiKey = getApiKey();
  if (!apiKey) {
    const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
    if (stale) return { ok: true, data: stale.data };
    return {
      ok: false,
      reason: 'Alpha Vantage API key not configured. Add EXPO_PUBLIC_ALPHAVANTAGE_API_KEY in ENV tab.',
    };
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol.toUpperCase()}&market=${market.toUpperCase()}&apikey=${apiKey}`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
      if (stale) return { ok: true, data: stale.data };
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as AlphaVantageDigitalCurrencyDailyResponse;
    if (data['Error Message'] || data.Note) {
      const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
      if (stale) return { ok: true, data: stale.data };
      return { ok: false, reason: data['Error Message'] || 'API rate limit reached' };
    }

    const series = data['Time Series (Digital Currency Daily)'];
    if (!series) return { ok: false, reason: 'Invalid API response' };

    const points = Object.entries(series)
      .map(([date, point]) => {
        const closeKey = `4a. close (${market.toUpperCase()})`;
        const openKey = `1a. open (${market.toUpperCase()})`;
        const highKey = `2a. high (${market.toUpperCase()})`;
        const lowKey = `3a. low (${market.toUpperCase()})`;
        const volumeKey = '5. volume';

        const close = Number(point[closeKey]);
        if (!Number.isFinite(close)) return null;

        const open = Number(point[openKey]);
        const high = Number(point[highKey]);
        const low = Number(point[lowKey]);
        const volume = Number(point[volumeKey]);

        const row: HistoricalPrice = {
          date,
          open: Number.isFinite(open) ? open : close,
          high: Number.isFinite(high) ? high : close,
          low: Number.isFinite(low) ? low : close,
          close,
          volume: Number.isFinite(volume) ? volume : undefined,
        };

        return row;
      })
      .filter((p): p is HistoricalPrice => p !== null)
      // sort ascending for charts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const limited = points.slice(Math.max(0, points.length - days));

    const historical: HistoricalData = {
      symbol: symbol.toUpperCase(),
      prices: limited,
      provider: 'alphavantage',
      lastUpdated: new Date().toISOString(),
    };

    await setCachedData('historical', cacheKey, historical, 'historical');
    return { ok: true, data: historical };
  } catch (error) {
    console.error('[AlphaVantage] Crypto historical fetch error:', error);
    const stale = await getStaleCachedData<HistoricalData>('historical', cacheKey);
    if (stale) return { ok: true, data: stale.data };
    return { ok: false, reason: 'Network error fetching crypto historical data', error };
  }
}

// ============================================
// Stock Quotes (backup for Stooq)
// ============================================

export async function fetchStockQuote(
  symbol: string
): Promise<MarketDataResult<PriceData>> {
  const cacheKey = symbol.toUpperCase();

  // Check cache first
  const cached = await getCachedData<PriceData>('av_quote', cacheKey);
  if (cached) {
    return { ok: true, data: cached };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const stale = await getStaleCachedData<PriceData>('av_quote', cacheKey);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }
    return {
      ok: false,
      reason: 'Alpha Vantage API key not configured',
    };
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      const stale = await getStaleCachedData<PriceData>('av_quote', cacheKey);
      if (stale) {
        return { ok: true, data: { ...stale.data, status: 'stale' } };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      const stale = await getStaleCachedData<PriceData>('av_quote', cacheKey);
      if (stale) {
        return { ok: true, data: { ...stale.data, status: 'stale' } };
      }
      return { ok: false, reason: data['Error Message'] || 'API rate limit reached' };
    }

    const quoteData = data['Global Quote'] as AlphaVantageQuote;
    if (!quoteData || !quoteData['05. price']) {
      return { ok: false, reason: 'No data for this symbol' };
    }

    const priceData: PriceData = {
      symbol: quoteData['01. symbol'],
      price: parseFloat(quoteData['05. price']),
      previousClose: parseFloat(quoteData['08. previous close']),
      change: parseFloat(quoteData['09. change']),
      changePercent: parseFloat(quoteData['10. change percent'].replace('%', '')),
      volume: parseInt(quoteData['06. volume'], 10),
      timestamp: new Date().toISOString(),
      provider: 'alphavantage',
      status: 'fresh',
      currency: 'USD',
    };

    await setCachedData('av_quote', cacheKey, priceData, 'quote');

    return { ok: true, data: priceData };
  } catch (error) {
    console.error('[AlphaVantage] Stock fetch error:', error);

    const stale = await getStaleCachedData<PriceData>('av_quote', cacheKey);
    if (stale) {
      return { ok: true, data: { ...stale.data, status: 'stale' } };
    }

    return {
      ok: false,
      reason: 'Network error fetching stock price',
      error,
    };
  }
}

// Helper to check if API key is configured
export function isAlphaVantageConfigured(): boolean {
  return getApiKey() !== null;
}

// Get remaining API calls estimate
export function getAlphaVantageRemainingCalls(): number {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  if (now - lastResetTime > dayInMs) {
    return MAX_REQUESTS_PER_DAY;
  }

  return Math.max(0, MAX_REQUESTS_PER_DAY - requestCount);
}

export const SUPPORTED_CRYPTO_SYMBOLS = Object.keys(CRYPTO_SYMBOLS);
