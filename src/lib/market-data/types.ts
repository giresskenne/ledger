// Market Data Types

export type MarketDataProvider = 'stooq' | 'alphavantage' | 'manual';

export type PriceDataStatus = 'fresh' | 'stale' | 'error' | 'manual';

export interface PriceData {
  symbol: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: string;
  provider: MarketDataProvider;
  status: PriceDataStatus;
  currency: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface HistoricalData {
  symbol: string;
  prices: HistoricalPrice[];
  provider: MarketDataProvider;
  lastUpdated: string;
}

export interface FXRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  provider: MarketDataProvider;
}

export type MarketDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; error?: unknown };

export interface CachedData<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
}

// Asset type to provider mapping
export type AssetType = 'stock' | 'etf' | 'crypto' | 'fx' | 'commodity' | 'bond' | 'manual';

export interface SymbolMapping {
  ticker: string;
  provider: MarketDataProvider;
  providerSymbol: string;
  assetType: AssetType;
}

// Stooq-specific types
export interface StooqQuote {
  symbol: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Alpha Vantage-specific types
export interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

export interface AlphaVantageFXRate {
  '1. From_Currency Code': string;
  '2. From_Currency Name': string;
  '3. To_Currency Code': string;
  '4. To_Currency Name': string;
  '5. Exchange Rate': string;
  '6. Last Refreshed': string;
  '7. Time Zone': string;
  '8. Bid Price': string;
  '9. Ask Price': string;
}

export interface AlphaVantageCryptoQuote {
  '1. symbol': string;
  '2. price': string;
  '3. volume': string;
  '4. last_updated': string;
}

// Provider configuration
export interface ProviderConfig {
  stooq: {
    baseUrl: string;
    rateLimit: number; // requests per minute
  };
  alphavantage: {
    baseUrl: string;
    apiKey: string | null;
    rateLimit: number;
  };
}

// Attribution info for data sources
export interface DataAttribution {
  provider: MarketDataProvider;
  name: string;
  url: string;
  disclaimer: string;
  requiresAttribution: boolean;
}

export const DATA_ATTRIBUTIONS: Record<MarketDataProvider, DataAttribution> = {
  stooq: {
    provider: 'stooq',
    name: 'Stooq',
    url: 'https://stooq.com',
    disclaimer: 'Stock data provided by Stooq.com. Data may be delayed.',
    requiresAttribution: true,
  },
  alphavantage: {
    provider: 'alphavantage',
    name: 'Alpha Vantage',
    url: 'https://www.alphavantage.co',
    disclaimer: 'FX and crypto data provided by Alpha Vantage. Free tier limitations apply.',
    requiresAttribution: true,
  },
  manual: {
    provider: 'manual',
    name: 'Manual Entry',
    url: '',
    disclaimer: 'Price manually entered by user.',
    requiresAttribution: false,
  },
};
