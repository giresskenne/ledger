import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CachedData } from './types';

const CACHE_PREFIX = 'market_data_cache_';

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
  quote: 15 * 60 * 1000, // 15 minutes for real-time quotes
  historical: 24 * 60 * 60 * 1000, // 24 hours for historical data
  fx: 60 * 60 * 1000, // 1 hour for FX rates
  crypto: 5 * 60 * 1000, // 5 minutes for crypto (more volatile)
  overview: 24 * 60 * 60 * 1000, // 24 hours for company overviews
} as const;

type CacheDuration = keyof typeof CACHE_DURATIONS;

function getCacheKey(type: string, symbol: string): string {
  return `${CACHE_PREFIX}${type}_${symbol.toUpperCase()}`;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export async function getCachedData<T>(
  type: string,
  symbol: string
): Promise<T | null> {
  try {
    const key = getCacheKey(type, symbol);
    const raw = await AsyncStorage.getItem(key);

    if (!raw) return null;

    const cached: CachedData<T> = JSON.parse(raw);

    if (isExpired(cached.expiresAt)) {
      // Don't delete - we might need stale data as fallback
      return null;
    }

    return cached.data;
  } catch (error) {
    console.warn('[MarketDataCache] Error reading cache:', error);
    return null;
  }
}

export async function getStaleCachedData<T>(
  type: string,
  symbol: string
): Promise<{ data: T; cachedAt: string } | null> {
  try {
    const key = getCacheKey(type, symbol);
    const raw = await AsyncStorage.getItem(key);

    if (!raw) return null;

    const cached: CachedData<T> = JSON.parse(raw);
    return { data: cached.data, cachedAt: cached.cachedAt };
  } catch (error) {
    console.warn('[MarketDataCache] Error reading stale cache:', error);
    return null;
  }
}

export async function setCachedData<T>(
  type: string,
  symbol: string,
  data: T,
  duration: CacheDuration = 'quote'
): Promise<void> {
  try {
    const key = getCacheKey(type, symbol);
    const now = Date.now();

    const cached: CachedData<T> = {
      data,
      cachedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CACHE_DURATIONS[duration]).toISOString(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.warn('[MarketDataCache] Error writing cache:', error);
  }
}

export async function clearCache(type?: string, symbol?: string): Promise<void> {
  try {
    if (type && symbol) {
      const key = getCacheKey(type, symbol);
      await AsyncStorage.removeItem(key);
      return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));

    if (type) {
      const typeKeys = cacheKeys.filter((k) => k.startsWith(`${CACHE_PREFIX}${type}_`));
      await AsyncStorage.multiRemove(typeKeys);
    } else {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.warn('[MarketDataCache] Error clearing cache:', error);
  }
}

export async function getCacheStats(): Promise<{
  totalItems: number;
  freshItems: number;
  staleItems: number;
  cacheSize: number;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));

    let freshItems = 0;
    let staleItems = 0;
    let cacheSize = 0;

    for (const key of cacheKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        cacheSize += raw.length;
        const cached: CachedData<unknown> = JSON.parse(raw);
        if (isExpired(cached.expiresAt)) {
          staleItems++;
        } else {
          freshItems++;
        }
      }
    }

    return {
      totalItems: cacheKeys.length,
      freshItems,
      staleItems,
      cacheSize,
    };
  } catch (error) {
    console.warn('[MarketDataCache] Error getting stats:', error);
    return { totalItems: 0, freshItems: 0, staleItems: 0, cacheSize: 0 };
  }
}
