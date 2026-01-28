# Ledger - Unified Investment Portfolio Tracker

A beautiful, comprehensive investment portfolio tracker that consolidates all your investments in one place. Track stocks, bonds, gold, real estate, fixed income, and more with real-time updates and AI-powered risk analysis.

## Features

### Onboarding Experience
A comprehensive, multi-stage onboarding flow with cinematic intro slides and country-conditioned personalization:

**Cinematic Intro (3 slides):**
1. Scattered wealth visualization - "Your wealth is scattered" (uses React Native icons without cards)
2. Unified portfolio view - "One view. Total clarity."
3. Premium features preview - "Smarter decisions." (features lightning bolt icon)

**Setup Flow:**
1. **Country Selection** - Choose home country (auto-sets currency with notification). Clean design with rounded (14px) buttons matching app style.
2. **Tracking Intent** - Select asset types to track in a vertical list layout:
   - Each asset type displays with a colored circular icon badge (unique color per asset)
   - Full asset group names displayed inline with icons (left-aligned)
   - Selected items show checkmark badges
   - Includes: Stocks & ETFs, Cryptocurrency, Real Estate, Cash Savings, Private Investments, Registered Accounts
3. **First Asset** - Full-featured asset creation screen matching the main app's add-asset screen:
   - **Category Selector**: All asset types with visual indicators (stocks, bonds, funds, gold, real estate, crypto, fixed income, derivatives, physical metals, cash)
   - **Asset Name**: Required field for naming the investment
   - **Ticker Symbol**: With live price search button for stocks, funds, and crypto
   - **Quantity & Prices**: Quantity, purchase price, and current price fields
   - **Currency Selector**: Choose from USD, EUR, GBP, BRL, JPY, CHF
   - **Purchase Date**: Date picker with calendar UI
   - **Conditional Fields**:
     - Fixed Income: Maturity date and interest rate
     - Real Estate: Property address field
   - **Platform/Broker**: Dropdown with 50+ popular brokers worldwide:
     - US: Fidelity, Charles Schwab, Vanguard, TD Ameritrade, E*TRADE, Robinhood, Webull, etc.
     - Canada: Wealthsimple, Questrade, TD Direct Investing, RBC, BMO, CIBC, Scotia iTRADE, etc.
     - UK: Hargreaves Lansdown, AJ Bell, Interactive Investor, Trading 212, Freetrade, eToro, etc.
     - Europe: Degiro, Scalable Capital, Trade Republic, Revolut, N26
     - Crypto: Coinbase, Binance, Kraken, Gemini, Crypto.com, Bitstamp
     - Banks: Bank of America, Chase, Wells Fargo, Citi, HSBC, Barclays
     - **"Other" option**: Allows custom broker name entry
   - **Notes**: Optional multi-line notes field
   - Live market data integration with real-time price fetching
   - Professional validation with checkmark submit button
   - Message: "This unlocks your dashboard. You can modify or add more later."
4. **Registered Accounts** - (CA/US/UK only) Select tax-advantaged accounts to track. Users can toggle accounts on/off and optionally enter their current contribution amounts for each selected account. Contributions are saved to the room store and used for calculating remaining room.
5. **Pay Frequency** - (CA/US/UK only) Set contribution frequency for savings targets
6. **Notifications** - Consent to notifications with customizable types. Icons inline with text, colorful switches, thinner card frames for cleaner UI.
7. **Room Reveal** - (Conditional: if registered accounts selected) Shows real calculated data from room store:
   - **Remaining Room**: Calculated based on contributions entered in step 4 (annual limit minus contributions)
   - **Save per Period**: Real savings targets based on selected pay frequency
   - **Progress Bars**: Show actual contribution progress for each account
   - All data is saved in room store and persists to the main Rooms tab
8. **Dashboard Reveal** - Success summary showing portfolio preview
9. **Premium Paywall** - Professional paywall matching the app's premium screen design with pricing tiers, feature grid, and 7-day free trial CTA

**Risk Score Messaging:**
- Slide 3 description emphasizes what users avoid: "Avoid concentration gaps. Get smart rebalancing tips. Prevent costly portfolio blind spots."

**Key Features:**
- Dynamic step flow based on country eligibility (registered accounts module only for CA/US/UK)
- Smooth slide animations with haptic feedback
- Back navigation through all steps including cinematic intro
- Skip button on cinematic intro
- Progress indicators with step counters
- No navigation errors - proper handling of first/last step boundaries
- Consistent design language throughout with rounded buttons (14px radius) and proper card styling

### Core Features (Free)
- **Unified Dashboard**: See your total portfolio value, gains/losses, and day changes at a glance
- **Multi-Asset Support**: Track 10 different asset types:
  - Stocks & ETFs
  - Bonds
  - Mutual Funds
  - Gold & Precious Metals
  - Real Estate
  - Cryptocurrency
  - Fixed Income (CDBs, Treasury)
  - Derivatives
  - Physical Metals
  - Cash Accounts
- **Holdings Management**: Add, edit, and track all your investments
- **Platform Tracking**: Know which assets are on which platform/broker
- **Manual Entry**: For assets without market prices, enter details manually
- **Maturity Tracking**: Track maturity dates for bonds and fixed income
- **Privacy Mode**: Hide balances with one tap

### Premium Features ($4.99/mo or $35.99/yr)
- **Risk Score Analysis**: Overall portfolio risk assessment (1-10 scale)
- **Sector Concentration**: Identify overexposure to specific sectors
- **Geographic Exposure**: See how investments are distributed globally
- **Asset Type Breakdown**: Visual breakdown by asset category
- **Smart Suggestions**: AI-powered recommendations for diversification
- **Price Alerts**: Get notified when assets hit target prices
- **Registered Account Room Tracker**: Track tax-advantaged contribution room (see below)

### Registered Account Room Tracker (Premium)
Track contribution room for tax-advantaged accounts across Canada, US, and UK:

**Canada (CRA)**
- TFSA (Tax-Free Savings Account) - 2026 limit: CAD 7,000
- RRSP (Registered Retirement Savings Plan) - 2026 limit: CAD 33,810
- FHSA (First Home Savings Account) - 2026 limit: CAD 8,000 (lifetime: CAD 40,000)

**United States (IRS)**
- Traditional IRA - 2026 limit: $7,500 (+ $1,000 catch-up for 50+)
- Roth IRA - 2026 limit: $7,500 (income limits apply)
- 401(k)/403(b)/457/TSP - 2026 limit: $24,500 (+ $8,000 catch-up, special $11,250 for 60-63)

**United Kingdom (GOV.UK)**
- ISA (Individual Savings Account) - 2025/26 limit: £20,000
- Lifetime ISA - 2025/26 limit: £4,000 (+ 25% gov bonus)
- Pension - 2025/26 allowance: £60,000

**Features:**
- Remaining room tracking with progress bars
- Save-to-max calculator (weekly/bi-weekly/monthly targets)
- Official limit override for complex situations (RRSP deduction limit, etc.)
- Tax year awareness (calendar year for CA/US, Apr 6-Apr 5 for UK)
- Contribution logging
- Links to official government sources

## App Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigation with badge indicators
│   │   ├── index.tsx        # Dashboard screen
│   │   ├── holdings.tsx     # Holdings list screen
│   │   ├── events.tsx       # Timeline/Events screen with maturity tracking
│   │   ├── rooms.tsx        # Registered account room tracker (Premium)
│   │   ├── analysis.tsx     # Premium analysis screen
│   │   └── settings.tsx     # Settings screen with notification preferences
│   ├── _layout.tsx          # Root layout with onboarding check
│   ├── onboarding.tsx       # Emotional onboarding flow
│   ├── add-asset.tsx        # Add new asset modal with transaction consolidation
│   ├── premium.tsx          # Premium upgrade screen with RevenueCat
│   ├── room-setup.tsx       # Country/profile setup for room tracker
│   └── asset/
│       └── [id].tsx         # Asset detail screen
├── lib/
│   ├── store.ts             # Zustand portfolio store with transaction-based consolidation
│   ├── room-store.ts        # Zustand room tracker store
│   ├── onboarding-store.ts  # Zustand onboarding state
│   ├── premium-store.ts     # Premium subscription state management
│   ├── notifications-store.ts # Notifications & events state management
│   ├── revenuecatClient.ts  # RevenueCat SDK wrapper
│   ├── types.ts             # TypeScript types (includes AssetTransaction, room types)
│   ├── formatters.ts        # Currency/date formatters
│   ├── cn.ts                # className utility
│   └── market-data/         # Market data integration (Phase 5)
│       ├── types.ts         # Market data types & attribution info
│       ├── cache.ts         # AsyncStorage caching layer
│       ├── stooq-client.ts  # Stooq API for global stocks (EOD)
│       ├── alphavantage-client.ts # Alpha Vantage for FX & crypto
│       ├── index.ts         # Unified market data service with fallback
│       └── hooks.ts         # React Query hooks for components
└── components/
    ├── Themed.tsx           # Theme components
    ├── AccountRoomCard.tsx  # Room tracker account card
    ├── PremiumPaywall.tsx   # Premium paywall modal and asset limit banner
    └── DataAttribution.tsx  # Market data source attribution UI
```

## Transaction-Based Position Consolidation

The app uses a sophisticated transaction-based system for listed assets (stocks, funds, crypto) to prevent duplicate positions:

### How It Works

**For Listed Assets (Stocks, Funds, Crypto):**
- When adding a new position with the same ticker, category, and currency, the app **consolidates** it into the existing position
- Each purchase is stored as a `BUY` transaction
- Position values (quantity, average cost, first purchase date) are computed from all transactions
- No dialogs or duplicate positions - seamless consolidation

**For Manual Assets (Real Estate, Bonds, etc.):**
- Each form submission creates a new asset
- Supports `valueHistory` tracking for growth over time
- No consolidation (each property/bond is unique)

### Asset Types

```typescript
interface AssetTransaction {
  id: string;
  type: 'BUY';
  date: string;        // ISO string
  quantity: number;
  price: number;       // per unit
  fees?: number;       // optional, default 0
}

interface Asset {
  // ... existing fields ...
  transactions?: AssetTransaction[];     // Transaction history for listed assets
  costBasisEstimated?: boolean;          // True when user chooses "start tracking today"
  valueHistory?: { date: string; value: number }[];  // Growth tracking for manual assets
}
```

### Example Workflow

1. **First Purchase**: Add AAPL with 10 shares @ $100 on Jan 1, 2021
   - Creates position: 10 shares, avg cost $100, first purchase Jan 1, 2021
   - Transaction: `[{ type: 'BUY', qty: 10, price: 100, date: '2021-01-01' }]`

2. **Second Purchase**: Add AAPL with 5 shares @ $200 on Jan 1, 2023
   - **Consolidates** into existing position
   - Position now: 15 shares, avg cost $133.33, first purchase Jan 1, 2021
   - Transactions: `[{ ... }, { type: 'BUY', qty: 5, price: 200, date: '2023-01-01' }]`

3. **Weighted Average Calculation**: `(10 × $100 + 5 × $200) / 15 = $133.33`

### "Start Tracking Today" Feature

For users who don't know their original purchase details:

- **Toggle**: "Start tracking from today" in add-asset screen
- **Behavior**:
  - Purchase date = today
  - Purchase price = current market price
  - Sets `costBasisEstimated = true`
- **Use Case**: User bought years ago, forgot details, wants to start tracking now

### Key Benefits

- **No Duplicates**: One position per ticker across the portfolio
- **Accurate Cost Basis**: Weighted average from all purchases
- **Complete History**: Full transaction log for each position
- **Backward Compatible**: Existing assets without transactions are converted automatically
- **Growth Tracking**: Manual assets now initialize with valueHistory

### Notifications & Events System (Phase 4)

The app includes a comprehensive notifications and events system:

**Events Tab:**
- Timeline view of all upcoming portfolio events
- Maturity date tracking for bonds and fixed income
- Dividend payment reminders
- Contribution reminders for registered accounts
- Portfolio rebalance suggestions
- Filter by event type
- Badge indicator showing upcoming events count

**Event Types:**
- `maturity` - Bond/fixed income maturity dates
- `dividend` - Expected dividend payments
- `price_alert` - Price target reached (Premium)
- `contribution_reminder` - Room contribution reminders
- `rebalance` - Portfolio rebalance suggestions

**Notification Preferences (Settings):**
- Master toggle for push notifications
- Individual toggles for each alert type
- Maturity alerts with configurable days-before notification
- Price alerts (Premium feature)
- Dividend alerts
- Contribution reminders

## Premium & Subscription System

The app uses RevenueCat for subscription management with the following tiers:

### Free Tier
- Track up to **10 assets**
- Basic dashboard with portfolio overview
- Asset allocation chart
- Top performers view

### Premium Tier ($8.99/mo or $49.99/yr)
- **Unlimited asset tracking**
- Risk score analysis (1-10 scale)
- Sector concentration analysis
- Geographic exposure analysis
- AI-powered diversification suggestions
- Registered account room tracker
- Price alerts
- Data export

### Premium Infrastructure

**Unified Entitlement System:**
- **`premium-store.ts`** - Single source of truth for subscription state
  - `useEntitlementStatus()` hook for all premium checks across the app
  - `isPremium` - UI gating (respects debug mode in dev)
  - `isActuallyPremium` - Real entitlement status (for RevenueCat interactions)
  - RevenueCat sync on app startup via `syncFromCustomerInfo()`
  - Customer info listener for real-time subscription updates

- **`revenuecatClient.ts`** - Centralized RevenueCat SDK wrapper
  - `initializeSubscriptionSync()` - Boot-time sync + listener setup
  - `restorePurchases()` - Restore previous purchases
  - Graceful handling when RevenueCat is not configured

**Key Features:**
- Single source of truth eliminates dual-state bugs
- Real-time sync from RevenueCat on app start and subscription changes
- Proper handling of cancelled subscriptions (still active until expiry)
- "Renewal off" UI messaging when willRenew=false but still active
- Debug mode for development testing (only visible in __DEV__ builds)

**Debug Mode (Development Only):**
- Settings screen shows "Developer Debug" section in __DEV__ builds
- Force Free / Force Premium / Normal modes
- UI-only override - doesn't affect actual RevenueCat subscription
- Useful for testing paywall flows and feature gates
- Never visible in production builds

**Components:**
- `PremiumPaywall.tsx` - Reusable paywall modal component
- `AssetLimitBanner` - Shows remaining assets warning
- Feature gates on Analysis and Rooms screens
- Real purchases enabled when RevenueCat is configured

## Tech Stack

- Expo SDK 53
- React Native 0.76.7
- Expo Router (file-based routing)
- Zustand (state management with persistence)
- React Query (async state)
- NativeWind/Tailwind (styling)
- react-native-reanimated (animations)
- lucide-react-native (icons)

## Asset Categories

| Category | Description | Auto-Update | Data Source |
|----------|-------------|-------------|-------------|
| Stocks | Individual stocks & ETFs | Yes | Stooq (EOD) |
| Bonds | Government & corporate bonds | No | Manual |
| Funds | Mutual funds & index funds | Yes | Stooq (EOD) |
| Gold | Gold ETFs & certificates | Yes | Stooq (EOD) |
| Real Estate | Property investments | No | Manual |
| Crypto | Cryptocurrencies | Yes | Alpha Vantage |
| Fixed Income | CDBs, Treasury bonds | No | Manual |
| Derivatives | Options, futures | Yes | Stooq (EOD) |
| Physical Metals | Coins, bars | No | Manual |
| Cash | Savings accounts | No | Manual |

## Market Data Integration (Phase 5)

### Overview
The app features a robust market data integration system that automatically fetches and caches real-time pricing data with intelligent fallback support.

### Data Providers

#### 1. **Stooq** (Global Stocks - Free, No API Key Required)
- **Purpose**: End-of-day stock data for global markets
- **Coverage**: US, UK, Germany, France, Japan, Canada, Australia, Switzerland, Brazil
- **Data**: Open, High, Low, Close, Volume
- **Update Frequency**: Daily after market close
- **Rate Limiting**: 1 request/second (conservative)
- **Docs**: https://stooq.com

#### 2. **Alpha Vantage** (FX & Crypto - Free tier 25 req/day)
- **Purpose**: Real-time FX rates and cryptocurrency prices
- **Coverage**: 150+ currency pairs, 100+ cryptocurrencies
- **Data**: Bid/Ask prices, volume, timestamp
- **Update Frequency**: Real-time (FX every 1-2 sec, Crypto every 5 min)
- **Rate Limiting**: 25 requests/day (12 seconds between requests)
- **Setup**: Add `EXPO_PUBLIC_ALPHAVANTAGE_API_KEY` in ENV tab
- **Docs**: https://www.alphavantage.co/documentation/

#### 3. **Manual Entry** (Fallback for all)
- Used for assets without market data
- Supports historical value tracking via `valueHistory` array
- Always available, no setup required

### Caching Layer

All API responses are cached using AsyncStorage with intelligent expiration:

```typescript
const CACHE_DURATIONS = {
  quote: 15 * 60 * 1000,        // 15 minutes for real-time quotes
  historical: 24 * 60 * 60 * 1000, // 24 hours for historical data
  fx: 60 * 60 * 1000,            // 1 hour for FX rates
  crypto: 5 * 60 * 1000,         // 5 minutes for crypto (more volatile)
};
```

### Fallback Strategy

1. **Fresh Data**: Fetch from API if cache is expired
2. **Stale Cache**: If API fails, use last cached value (show "Cached" badge)
3. **Manual Fallback**: If both fail, use user-entered price
4. **Network Error**: Gracefully handle offline with cached data

### Usage in Components

**Onboarding Flow:**
The FirstAssetStep in onboarding uses live market data to populate prices automatically:
```typescript
// Quick picks fetch real prices when tapped
const handleQuickAdd = async (asset) => {
  const result = await searchTicker(asset.symbol, asset.category, undefined, selectedCurrency);
  const currentPrice = result.ok && result.data.currentPrice ? result.data.currentPrice : 100;
  addAsset({
    name: asset.name,
    ticker: asset.symbol,
    currentPrice: currentPrice,
    purchasePrice: currentPrice,
    isManual: !result.ok, // Flag as manual if API failed
  });
};

// Ticker search box with real-time price lookup
const handleTickerSearch = async () => {
  const result = await searchTicker(searchTicker.trim(), 'stocks', undefined, selectedCurrency);
  if (result.ok && result.data.currentPrice) {
    addAsset({
      name: result.data.name,
      ticker: result.data.ticker,
      currentPrice: result.data.currentPrice,
      purchasePrice: result.data.currentPrice,
      isManual: false,
    });
  }
};
```

**Add Asset Screen:**
The add-asset screen includes a "Search Ticker" button that fetches real prices:
```typescript
const handleTickerSearch = async () => {
  const result = await searchTicker(ticker.trim(), category, undefined, currency);
  if (result.ok && result.data.currentPrice) {
    setCurrentPrice(result.data.currentPrice.toString());
    if (!purchasePrice) {
      setPurchasePrice(result.data.currentPrice.toString());
    }
  }
};
```

**Asset Display:**
```typescript
import { useAssetPrice, usePriceDisplay } from '@/lib/market-data/hooks';

function AssetCard({ asset }) {
  const priceData = usePriceDisplay(asset);

  return (
    <View>
      <Text>${priceData.price}</Text>
      <ProviderBadge provider={priceData.provider} status={priceData.isFresh ? 'fresh' : 'stale'} />
    </View>
  );
}
```

### API Response Types

```typescript
// Price data with status
interface PriceData {
  symbol: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: string;
  provider: 'stooq' | 'alphavantage' | 'manual';
  status: 'fresh' | 'stale' | 'error' | 'manual';
  currency: string;
}

// All results wrapped in Result type
type MarketDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; error?: unknown }
```

### Data Attribution

The app properly attributes data sources with UI components:

- **DataAttribution**: Full provider information with disclaimer and link
- **ProviderBadge**: Compact badge showing provider and data freshness
- **AttributionFooter**: Footer listing all data sources used
- **StatusIndicator**: Visual indicator of data freshness (green/yellow/red/gray)

```typescript
import { DataAttribution, ProviderBadge } from '@/components/DataAttribution';

// In screens, add attribution footer
<AttributionFooter providers={['stooq', 'alphavantage']} />

// For individual assets
<ProviderBadge provider={priceData.provider} status={priceData.status} />
```

### Service Status & Cache Management

```typescript
import { useMarketDataStatus, clearCache } from '@/lib/market-data';

// Check if providers are configured
const status = useMarketDataStatus();
// Returns: { stooq, alphavantage, cache }

// Clear cache
await clearCache();           // Clear all
await clearCache('quote');    // Clear quotes only
await clearCache('quote', 'AAPL'); // Clear AAPL quote
```

### Configuration

**Environment Variables:**
```
EXPO_PUBLIC_ALPHAVANTAGE_API_KEY=your_api_key_here
```

**No configuration needed for Stooq** (free public API)

### Testing Market Data

1. **See Live Data**: Go to Holdings tab, add a stock (e.g., "AAPL")
2. **Check Status**: View the provider badge showing data freshness
3. **View Logs**: Check the LOGS tab in your dev app for API calls
4. **Test Offline**: Disconnect network, data comes from cache
5. **Clear Cache**: Settings tab has cache management options (when implemented)

### Performance Considerations

- **Rate Limiting**: Conservative limits prevent API quota exhaustion
- **Caching**: Reduces API calls by 90%+ for repeated views
- **Lazy Loading**: Prices fetch on-demand, not on app startup
- **Batch Support**: Multiple assets can be fetched sequentially
- **Stale-While-Revalidate**: App shows stale data while fetching fresh

### Future Enhancements

- [ ] Real-time WebSocket support for crypto
- [ ] Historical price charts with multiple timeframes
- [ ] Multi-currency conversion with live rates
- [ ] Price alerts (already in notification system)
- [ ] Additional providers (IEX Cloud, Finnhub, etc.)


## Color Scheme

- Background: `#0A0A0F` (near black)
- Primary: `#6366F1` (indigo)
- Premium/Gold: `#F59E0B` (amber)
- Success: `#10B981` (emerald)
- Danger: `#EF4444` (red)

## Phase 6: Polish & Launch

This phase focuses on production readiness with compliance, UX improvements, and error handling.

### Compliance Documents

Legal pages accessible from Settings > Support:

- **Terms of Service** (`/terms`) - Usage terms, disclaimers, limitations
- **Privacy Policy** (`/privacy`) - Data collection, storage, third-party services
- **Investment Disclaimer** (`/disclaimer`) - Financial advice disclaimer, risk warnings

Key compliance points:
- Not financial advice disclaimer prominently displayed
- Data attribution for market data sources
- Privacy-first design (data stored locally on device)
- Clear explanation of third-party services used

### Empty States

Beautiful, contextual empty states for all list views:

- **No Assets**: Friendly prompt to add first investment
- **No Search Results**: Clear message with option to clear search
- **No Events**: Explanation of what events will appear
- **No Rooms**: Premium feature introduction (for non-premium users)
- **Error State**: Generic error with retry option
- **Network Error**: Offline-specific messaging

Components in `src/components/EmptyState.tsx`:
```typescript
import {
  EmptyState,
  NoAssetsEmptyState,
  NoSearchResultsEmptyState,
  ErrorState,
  NetworkErrorState
} from '@/components/EmptyState';
```

### Theme Support

Theme infrastructure ready in `src/lib/theme-store.tsx`:
- Dark theme (current default)
- Light theme tokens defined
- Theme persistence via AsyncStorage
- `useTheme()` hook for components

Currently dark-mode only. Light theme UI implementation planned for future release.

### Error Handling

Graceful error handling throughout the app:

1. **Market Data Errors**: Fallback to cached/manual data with visual indicator
2. **Network Errors**: Show cached data, display connection warning
3. **Form Validation**: Inline error messages with haptic feedback
4. **API Failures**: Toast notifications with retry options
5. **Empty States**: Contextual messaging instead of blank screens

### App Store Assets

Required for submission (create via "Share" > "Submit to App Store"):
- App icon (1024x1024)
- Screenshots for various device sizes
- App description and keywords
- Privacy policy URL
- Support URL

### Beta Testing

Testing checklist before launch:
- [ ] All premium features gated correctly
- [ ] RevenueCat purchases working on TestFlight
- [ ] Market data showing correct prices
- [ ] Notifications scheduling correctly
- [ ] Offline mode works with cached data
- [ ] Compliance pages accessible and accurate
- [ ] Empty states display correctly
- [ ] Error handling graceful in all scenarios
