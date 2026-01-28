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
  applyAssetContribution: (params: { assetId: string; amount: number; date: string }) => void;
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
                      sector: assetData.sector ?? asset.sector,
                      country: assetData.country ?? asset.country,
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
              ? { ...asset, ...updates, lastUpdated: new Date().toISOString() }
              : asset
          ),
        }));
      },

      applyAssetContribution: ({ assetId, amount, date }) => {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return;

        const asset = get().assets.find((a) => a.id === assetId);
        if (!asset) return;

        const unitPrice = Number(asset.currentPrice);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;

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
          return;
        }

        // For "per-unit priced" assets, treat contribution as buying more units at current price.
        const addedQty = amt / unitPrice;
        if (!Number.isFinite(addedQty) || addedQty <= 0) return;

        // If it's a listed asset with a ticker, record an explicit BUY transaction.
        if (isListedAsset(asset.category, asset.ticker)) {
          const existingTxns = toTxnFromLegacy(asset);
          const newTxn: AssetTransaction = {
            id: `txn-${Date.now()}`,
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
          return;
        }

        const prevQty = Math.max(0, Number(asset.quantity) || 0);
        const nextQty = prevQty + addedQty;
        const prevCost = (Number(asset.purchasePrice) || 0) * prevQty;
        const nextAvgCost = nextQty > 0 ? (prevCost + amt) / nextQty : asset.purchasePrice;

        get().updateAsset(asset.id, {
          quantity: nextQty,
          purchasePrice: nextAvgCost,
        });
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
