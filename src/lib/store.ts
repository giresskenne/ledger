/**
 * Portfolio store (Zustand): holds assets/holdings and provides mutations for buys/contributions.
 * Includes logic for consolidating listed positions and recording contribution-driven buys.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset, AssetCategory, Currency, PortfolioSummary, AllocationData, RiskAnalysis, CATEGORY_INFO, Sector, CountryCode, SECTOR_INFO, COUNTRY_INFO, AssetTransaction } from './types';

// Categories that represent listed assets (ticker-based)
const LISTED_CATEGORIES: AssetCategory[] = ['stocks', 'funds', 'crypto'];

// Helper: Check if an asset is a listed asset (stocks, funds, crypto with ticker)
function isListedAsset(category: AssetCategory, ticker?: string): boolean {
  return LISTED_CATEGORIES.includes(category) && !!ticker?.trim();
}

function inferListedAssetCountry(params: { category: AssetCategory; ticker?: string }): CountryCode | undefined {
  // For listed assets, country should not default to onboarding country. It should be derived from the listing.
  // MVP rule:
  // - Crypto: treat as GLOBAL.
  // - Stocks/Funds: default to US unless the ticker includes a known suffix (e.g., AAPL.US, SU.CA).
  const { category, ticker } = params;
  const symbol = ticker?.trim().toUpperCase();
  if (!symbol) return undefined;

  if (category === 'crypto') return 'GLOBAL';

  const suffix = symbol.includes('.') ? symbol.split('.').pop() : null;
  if (suffix && suffix in COUNTRY_INFO) return suffix as CountryCode;

  return 'US';
}

// Helper: Convert legacy asset (without transactions) into transaction array
// This ensures backward compatibility with existing assets
function toTxnFromLegacy(asset: Asset): AssetTransaction[] {
  if (asset.transactions?.length) return asset.transactions;

  return [{
    id: `legacy-${asset.id}`,
    type: 'BUY',
    date: asset.purchaseDate,
    quantity: asset.quantity,
    price: asset.purchasePrice,
    fees: 0,
  }];
}

// Helper: Compute position details from transaction array
function computePositionFromTxns(txns: AssetTransaction[]): {
  totalQty: number;
  avgCost: number;
  firstDate: string;
} {
  const buys = txns.filter(t => t.type === 'BUY');
  const totalQty = buys.reduce((s, t) => s + t.quantity, 0);
  const totalCost = buys.reduce((s, t) => s + (t.quantity * t.price) + (t.fees ?? 0), 0);
  const avgCost = totalQty > 0 ? totalCost / totalQty : 0;

  const earliest = buys
    .map(t => new Date(t.date).getTime())
    .reduce((min, v) => Math.min(min, v), Number.POSITIVE_INFINITY);

  const firstDate = Number.isFinite(earliest)
    ? new Date(earliest).toISOString()
    : new Date().toISOString();

  return { totalQty, avgCost, firstDate };
}

// Mock data for demo - intentionally empty to start fresh for testing consolidation
const MOCK_ASSETS: Asset[] = [];

// Flag to track if we've already cleared old persisted data
const MIGRATION_VERSION = '1.0.0-consolidation';

interface PortfolioState {
  assets: Asset[];
  isPremium: boolean;
  selectedCurrency: Currency;

  // Actions
  addAsset: (asset: Omit<Asset, 'id' | 'lastUpdated'>) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  applyAssetContribution: (params: {
    assetId: string;
    amount: number;
    date: string;
    occurrenceId?: string;
    unitPriceOverride?: number;
  }) => { ok: boolean; wasApplied: boolean; reason?: string };
  setPremium: (isPremium: boolean) => void;
  setCurrency: (currency: Currency) => void;
  resetStore: () => Promise<void>;

  // Computed
  getPortfolioSummary: () => PortfolioSummary;
  getAllocation: () => AllocationData[];
  getRiskAnalysis: () => RiskAnalysis;
  getAssetsByCategory: (category: AssetCategory) => Asset[];
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      assets: MOCK_ASSETS,
      isPremium: false,
      selectedCurrency: 'USD',

      addAsset: (assetData) => {
        // Normalize ticker to uppercase for consistent matching
        const ticker = assetData.ticker?.trim().toUpperCase();
        const inferredCountry = isListedAsset(assetData.category, ticker)
          ? inferListedAssetCountry({ category: assetData.category, ticker })
          : undefined;

        // Check if this is a listed asset (stocks, funds, crypto with ticker)
        if (isListedAsset(assetData.category, ticker)) {
          // Look for existing asset with same ticker + category + currency
          const existing = get().assets.find(
            (a) =>
              a.ticker?.trim().toUpperCase() === ticker &&
              a.category === assetData.category &&
              a.currency === assetData.currency
          );

          if (existing) {
            // CONSOLIDATION: Add new BUY transaction to existing position
            const existingTxns = toTxnFromLegacy(existing);
            const newTxn: AssetTransaction = {
              id: `txn-${Date.now()}`,
              type: 'BUY',
              date: assetData.purchaseDate,
              quantity: assetData.quantity,
              price: assetData.purchasePrice,
              fees: 0,
            };
            const updatedTxns = [...existingTxns, newTxn];

            // Recompute position from all transactions
            const { totalQty, avgCost, firstDate } = computePositionFromTxns(updatedTxns);

            // Update existing asset with new consolidated values
            set((state) => ({
              assets: state.assets.map((asset) =>
                asset.id === existing.id
                  ? {
                      ...asset,
                      transactions: updatedTxns,
                      quantity: totalQty,
                      purchasePrice: avgCost,
                      purchaseDate: firstDate,
                      currentPrice: assetData.currentPrice, // Update with latest price
                      lastUpdated: new Date().toISOString(),
                      // Preserve other fields that might have been updated
                      heldIn: assetData.heldIn !== undefined ? assetData.heldIn : asset.heldIn,
                      sector: assetData.sector ?? asset.sector,
                      // Always infer for listed assets to avoid onboarding defaults skewing geo analytics.
                      country: inferredCountry ?? asset.country,
                      platform: assetData.platform ?? asset.platform,
                      notes: assetData.notes ?? asset.notes,
                    }
                  : asset
              ),
            }));
            return; // Exit early - no new asset created
          }

          // No existing position - create new one with transaction
          const newTxn: AssetTransaction = {
            id: `txn-${Date.now()}`,
            type: 'BUY',
            date: assetData.purchaseDate,
            quantity: assetData.quantity,
            price: assetData.purchasePrice,
            fees: 0,
          };

          const newAsset: Asset = {
            ...assetData,
            ticker, // Use normalized ticker
            id: Date.now().toString(),
            lastUpdated: new Date().toISOString(),
            transactions: [newTxn],
            country: inferredCountry ?? assetData.country,
            countryName: inferredCountry ? undefined : assetData.countryName,
          };
          set((state) => ({ assets: [...state.assets, newAsset] }));
        } else {
          // NOT a listed asset - create new asset (manual asset behavior)
          const newAsset: Asset = {
            ...assetData,
            id: Date.now().toString(),
            lastUpdated: new Date().toISOString(),
          };

          // Initialize valueHistory for manual assets if not present
          if (assetData.isManual && (!assetData.valueHistory || assetData.valueHistory.length === 0)) {
            newAsset.valueHistory = [{
              date: assetData.purchaseDate,
              value: assetData.currentPrice
            }];
          }

          set((state) => ({ assets: [...state.assets, newAsset] }));
        }
      },

      updateAsset: (id, updates) => {
        set((state) => ({
          assets: state.assets.map((asset) =>
            asset.id === id
              ? (() => {
                  const merged = { ...asset, ...updates };
                  const normalizedTicker = merged.ticker?.trim().toUpperCase();
                  const inferredCountry = isListedAsset(merged.category, normalizedTicker)
                    ? inferListedAssetCountry({ category: merged.category, ticker: normalizedTicker })
                    : undefined;

                  return {
                    ...merged,
                    ticker: normalizedTicker,
                    country: inferredCountry ?? merged.country,
                    countryName: inferredCountry ? undefined : merged.countryName,
                    lastUpdated: new Date().toISOString(),
                  };
                })()
              : asset
          ),
        }));
      },

      applyAssetContribution: ({ assetId, amount, date, occurrenceId, unitPriceOverride }) => {
        const amt = Number(amount);
        if (__DEV__) {
          console.debug(
            `[Contribution] applyAssetContribution asset=${assetId} amount=${amt} occurrenceId=${occurrenceId} override=${unitPriceOverride}`
          );
        }
        if (!Number.isFinite(amt) || amt <= 0) return { ok: false, wasApplied: false, reason: 'Invalid amount' };

        const asset = get().assets.find((a) => a.id === assetId);
        if (!asset) return { ok: false, wasApplied: false, reason: 'Asset not found' };

        // Prefer the latest price, but fall back to purchase price if market data is missing.
        // This makes "Mark as done" work even when a quote provider fails.
        const overridePrice = Number(unitPriceOverride);
        const unitPrice = Number.isFinite(overridePrice) && overridePrice > 0
          ? overridePrice
          : Number.isFinite(Number(asset.currentPrice)) && Number(asset.currentPrice) > 0
            ? Number(asset.currentPrice)
            : Number(asset.purchasePrice);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          return { ok: false, wasApplied: false, reason: 'Missing price' };
        }

        // Cash behaves like a "balance" (quantity is typically 1).
        if (asset.category === 'cash') {
          const qty = Math.max(1, Number(asset.quantity) || 1);
          const currentTotal = asset.currentPrice * qty;
          const investedTotal = asset.purchasePrice * qty;
          const nextCurrentTotal = currentTotal + amt;
          const nextInvestedTotal = investedTotal + amt;

          const nextCurrentPerUnit = nextCurrentTotal / qty;
          const nextInvestedPerUnit = nextInvestedTotal / qty;

          const nextHistory = asset.isManual
            ? [...(asset.valueHistory ?? []), { date, value: nextCurrentPerUnit }]
            : asset.valueHistory;

          get().updateAsset(asset.id, {
            currentPrice: nextCurrentPerUnit,
            purchasePrice: nextInvestedPerUnit,
            valueHistory: nextHistory,
          });
          return { ok: true, wasApplied: true };
        }

        // For "per-unit priced" assets, treat contribution as buying more units at current price.
        const addedQty = amt / unitPrice;
        if (!Number.isFinite(addedQty) || addedQty <= 0) return { ok: false, wasApplied: false, reason: 'Invalid computed quantity' };

        // If it's a listed asset with a ticker, record an explicit BUY transaction.
        if (isListedAsset(asset.category, asset.ticker)) {
          const existingTxns = toTxnFromLegacy(asset);
          const stableId = occurrenceId ? `txn-recurring-${asset.id}-${occurrenceId}` : null;
          if (stableId && existingTxns.some((t) => t.id === stableId)) return { ok: true, wasApplied: false };
          const newTxn: AssetTransaction = {
            id: stableId ?? `txn-${Date.now()}`,
            type: 'BUY',
            date,
            quantity: addedQty,
            price: unitPrice,
            fees: 0,
          };
          const updatedTxns = [...existingTxns, newTxn];

          const { totalQty, avgCost, firstDate } = computePositionFromTxns(updatedTxns);

          get().updateAsset(asset.id, {
            transactions: updatedTxns,
            quantity: totalQty,
            purchasePrice: avgCost,
            purchaseDate: firstDate,
          });
          return { ok: true, wasApplied: true };
        }

        const prevQty = Math.max(0, Number(asset.quantity) || 0);
        const nextQty = prevQty + addedQty;
        const prevCost = (Number(asset.purchasePrice) || 0) * prevQty;
        const nextAvgCost = nextQty > 0 ? (prevCost + amt) / nextQty : asset.purchasePrice;

        get().updateAsset(asset.id, {
          quantity: nextQty,
          purchasePrice: nextAvgCost,
        });
        return { ok: true, wasApplied: true };
      },

      deleteAsset: (id) => {
        set((state) => ({
          assets: state.assets.filter((asset) => asset.id !== id),
        }));
      },

      setPremium: (isPremium) => {
        const currentState = get().isPremium;
        console.log('[Premium Debug] State change:', {
          from: currentState,
          to: isPremium,
          timestamp: new Date().toISOString(),
        });
        set({ isPremium });
      },

      setCurrency: (currency) => set({ selectedCurrency: currency }),

      getPortfolioSummary: () => {
        const { assets } = get();
        const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);
        const totalInvested = assets.reduce((sum, asset) => sum + asset.purchasePrice * asset.quantity, 0);
        const totalGain = totalValue - totalInvested;
        const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

        // Simulated day change
        const dayChange = totalValue * 0.0085;
        const dayChangePercent = 0.85;

        return {
          totalValue,
          totalInvested,
          totalGain,
          totalGainPercent,
          dayChange,
          dayChangePercent,
        };
      },

      getAllocation: () => {
        const { assets } = get();
        const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);

        const categoryTotals = assets.reduce((acc, asset) => {
          const value = asset.currentPrice * asset.quantity;
          acc[asset.category] = (acc[asset.category] || 0) + value;
          return acc;
        }, {} as Record<AssetCategory, number>);

        return Object.entries(categoryTotals)
          .map(([category, value]) => ({
            category: category as AssetCategory,
            value,
            percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
            color: CATEGORY_INFO[category as AssetCategory].color,
          }))
          .sort((a, b) => b.value - a.value);
      },

      getRiskAnalysis: () => {
        const { assets } = get();
        const totalValue = assets.reduce((sum, asset) => sum + asset.currentPrice * asset.quantity, 0);

        // Category concentration
        const categoryConcentration = assets.reduce((acc, asset) => {
          const value = asset.currentPrice * asset.quantity;
          const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
          acc[asset.category] = (acc[asset.category] || 0) + percentage;
          return acc;
        }, {} as Record<string, number>);

        const assetTypeConcentration = Object.entries(categoryConcentration)
          .map(([name, percentage]) => ({
            name: CATEGORY_INFO[name as AssetCategory]?.label || name,
            percentage,
            riskLevel: (percentage > 40 ? 'high' : percentage > 25 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
          }))
          .sort((a, b) => b.percentage - a.percentage);

        // Real sector concentration from asset data
        const sectorTotals = assets.reduce((acc, asset) => {
          const sector = asset.sector || 'other';
          const value = asset.currentPrice * asset.quantity;
          acc[sector] = (acc[sector] || 0) + value;
          return acc;
        }, {} as Record<string, number>);

        const sectorConcentration = Object.entries(sectorTotals)
          .map(([sector, value]) => ({
            name: SECTOR_INFO[sector as Sector]?.label || sector,
            percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
            riskLevel: (value / totalValue * 100 > 40 ? 'high' : value / totalValue * 100 > 25 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 6);

        // Real geographic concentration from asset data
        const countryTotals = assets.reduce((acc, asset) => {
          const country = asset.country || 'OTHER';
          const value = asset.currentPrice * asset.quantity;
          acc[country] = (acc[country] || 0) + value;
          return acc;
        }, {} as Record<string, number>);

        const geographicConcentration = Object.entries(countryTotals)
          .map(([country, value]) => ({
            name: COUNTRY_INFO[country as CountryCode]?.name || country,
            flag: COUNTRY_INFO[country as CountryCode]?.flag || '🏳️',
            percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
            riskLevel: (value / totalValue * 100 > 60 ? 'high' : value / totalValue * 100 > 40 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 6);

        // Generate suggestions based on real data
        const suggestions: string[] = [];

        const topSector = sectorConcentration[0];
        if (topSector && topSector.percentage > 40) {
          suggestions.push(`Your ${topSector.name.toLowerCase()} exposure is ${topSector.percentage.toFixed(0)}%. Consider diversifying into other sectors to reduce concentration risk.`);
        }

        const topCountry = geographicConcentration[0];
        if (topCountry && topCountry.percentage > 60) {
          suggestions.push(`${topCountry.percentage.toFixed(0)}% of your portfolio is in ${topCountry.name}. Adding international exposure could reduce geographic risk.`);
        }

        const stocksPercent = categoryConcentration['stocks'] || 0;
        const bondsPercent = categoryConcentration['bonds'] || 0;
        const fixedIncomePercent = categoryConcentration['fixed_income'] || 0;

        if (stocksPercent > 50 && (bondsPercent + fixedIncomePercent) < 15) {
          suggestions.push('Your equity allocation is high relative to fixed income. Adding bonds can reduce volatility during market downturns.');
        }

        if (!categoryConcentration['gold'] && !categoryConcentration['physical_metals']) {
          suggestions.push('Consider adding 5-10% allocation to gold or precious metals as an inflation hedge.');
        }

        // Calculate overall risk score
        const highRiskCount = [...assetTypeConcentration, ...sectorConcentration, ...geographicConcentration]
          .filter(c => c.riskLevel === 'high').length;

        const overallRiskScore = Math.min(10, Math.max(1, 3 + highRiskCount * 1.5));

        return {
          overallRiskScore,
          sectorConcentration,
          geographicConcentration,
          assetTypeConcentration,
          suggestions,
        };
      },

      getAssetsByCategory: (category) => {
        return get().assets.filter((asset) => asset.category === category);
      },

      resetStore: async () => {
        // Clear the state
        set({ assets: [], isPremium: false, selectedCurrency: 'USD' });
        // Clear AsyncStorage
        await AsyncStorage.removeItem('ledger-portfolio');
      },
    }),
    {
      name: 'ledger-portfolio',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        assets: state.assets,
        isPremium: state.isPremium,
        selectedCurrency: state.selectedCurrency,
      }),
    }
  )
);
