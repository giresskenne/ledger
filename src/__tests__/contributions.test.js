/**
 * Unit tests for contribution-driven updates (asset contribution + dedupe by occurrenceId).
 * Uses CommonJS so we can mock AsyncStorage before importing the persisted stores.
 */

global.__DEV__ = true;

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key) => store.get(key) ?? null),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key) => {
        store.delete(key);
      }),
    },
  };
});

const { usePortfolioStore } = require('@/lib/store');

describe('applyAssetContribution', () => {
  afterEach(() => {
    usePortfolioStore.setState({ assets: [], isPremium: false, selectedCurrency: 'USD' });
  });

  it('applies at tap-time price and dedupes by occurrenceId for listed assets', () => {
    const now = new Date('2026-02-01T12:00:00.000Z').toISOString();
    const asset = {
      id: 'asset-1',
      name: 'Apple',
      ticker: 'AAPL',
      category: 'stocks',
      quantity: 1,
      purchasePrice: 100,
      currentPrice: 120,
      purchaseDate: now,
      currency: 'USD',
      isManual: false,
      lastUpdated: now,
      transactions: [
        { id: 'txn-0', type: 'BUY', date: now, quantity: 1, price: 100, fees: 0 },
      ],
      recurringContribution: {
        enabled: true,
        frequency: 'weekly',
        weekday: 1,
        amount: 100,
        autoApply: true,
      },
    };

    usePortfolioStore.setState({ assets: [asset], isPremium: false, selectedCurrency: 'USD' });

    const occurrenceId = '2026-02-01';
    const result1 = usePortfolioStore.getState().applyAssetContribution({
      assetId: asset.id,
      amount: 100,
      date: now,
      occurrenceId,
      unitPriceOverride: 200,
    });
    expect(result1.ok).toBe(true);
    expect(result1.wasApplied).toBe(true);

    const updated1 = usePortfolioStore.getState().assets[0];
    expect(updated1.quantity).toBeCloseTo(1.5, 8);
    expect(updated1.purchasePrice).toBeCloseTo(133.333333, 5);
    expect(updated1.transactions.some((t) => t.id === `txn-recurring-${asset.id}-${occurrenceId}`)).toBe(true);

    const result2 = usePortfolioStore.getState().applyAssetContribution({
      assetId: asset.id,
      amount: 100,
      date: now,
      occurrenceId,
      unitPriceOverride: 250,
    });
    expect(result2.ok).toBe(true);
    expect(result2.wasApplied).toBe(false);

    const updated2 = usePortfolioStore.getState().assets[0];
    expect(updated2.quantity).toBeCloseTo(1.5, 8);
  });

  it('fails with a clear reason when price is missing and no override is provided', () => {
    const now = new Date('2026-02-01T12:00:00.000Z').toISOString();
    const asset = {
      id: 'asset-2',
      name: 'NoPrice',
      ticker: 'NOPRICE',
      category: 'stocks',
      quantity: 1,
      purchasePrice: 0,
      currentPrice: 0,
      purchaseDate: now,
      currency: 'USD',
      isManual: false,
      lastUpdated: now,
      transactions: [
        { id: 'txn-0', type: 'BUY', date: now, quantity: 1, price: 0, fees: 0 },
      ],
    };

    usePortfolioStore.setState({ assets: [asset], isPremium: false, selectedCurrency: 'USD' });

    const result = usePortfolioStore.getState().applyAssetContribution({
      assetId: asset.id,
      amount: 100,
      date: now,
      occurrenceId: '2026-02-01',
    });

    expect(result.ok).toBe(false);
    expect(result.wasApplied).toBe(false);
    expect(result.reason).toBe('Missing price');
  });
});
