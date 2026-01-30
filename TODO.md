# TODO (PRD v2 Gap → Execution Plan)

Source: `investment_tracker_PRD_v2_gap_analysis.md`

## Local / Offline (no 3rd‑party required)

- [x] **First‑launch disclaimer gating** (store “accepted” + enforce on first run)
- [x] **Manual valuation history capture**
  - Append dated entries when user taps “Update Value”
  - UI to review/edit/delete past valuation points
- [x] **Performance monitoring UI**
  - Time range selector: `1M / 6M / 1Y / All Time / Since Inception`
  - Toggle: absolute vs % returns
  - Toggle: hide performance metrics
  - Clear labels for manual vs listed assets
- [x] **Dashboard visualization + interactions (local rendering)**
  - Asset class allocation chart
  - Country allocation chart (with flags)
  - Sector allocation chart (treemap)
  - Tap-to-filter / drill-down interactions
- [x] **Events & notifications (local)**
  - Maturity cadence: `90/30/7 days` + day-of
  - Stale manual valuation reminders (user configurable)
  - Amortization milestone events (if/when schedules exist)
  - Calendar view for Events (in addition to list)
- [x] **Fixed income details (manual)**
  - Amortization schedule view
  - Principal vs interest breakdown
- [x] **Free vs Premium behavior alignment**
  - Free: concentration warnings “count only”
  - Premium: detailed breakdown + insights
- [x] **Risk analysis PRD compliance**
  - Remove prescriptive language (no target % like “add 5–10%”)
  - Neutral indicators (avoid red/green “advice” vibes)
- [ ] **Local-first storage decision + implementation**
  - Decide: keep AsyncStorage for MVP vs migrate portfolio to `expo-sqlite`
  - If migrating: schema + migrations + adapters
- [ ] **Authentication scope decision** after MVP everything should be local 
  - Decide: “local-only lock” (biometrics/passcode) vs real accounts

## 3rd‑Party / Network Dependent

- [x] **Listed asset historical charts + time-series performance** (requires market data provider access)
- [x] **Market hours status + “market open/closed” logic** (requires exchange/calendar data, usually provider-backed)
- [x] **Commodity auto-pricing (gold/silver)** (requires commodity price provider)
- [x] **Currency conversion + consistent cross-currency totals** (requires FX rate provider)
- [ ] **Subscriptions (RevenueCat) production readiness**
  - Correct products/offerings mapping
  - Entitlement verification/edge cases (store/network)
- [ ] **Authentication with real accounts** (if chosen) (requires auth provider/back end)
- [ ] **Cloud backup (encrypted) + restore** (if chosen) (requires iCloud/Drive/backend)
- [ ] **Analytics/crash reporting** (if chosen) (requires analytics backend)

## Testing (Manual)

- [ ] **FX conversion (Alpha Vantage)**
  - Add 2 assets with different currencies (e.g., USD + EUR) and confirm Dashboard totals are in the selected base currency
  - Confirm the “approximate totals” hint appears if FX rates aren’t available
- [ ] **Commodities (Stooq)**
  - Add `gold`/`physical_metals` asset with ticker `XAUUSD` (gold) or `XAGUSD` (silver)
  - Confirm live price + Price History appear on the asset detail screen
- [ ] **Listed asset price history + time ranges**
  - Open a listed asset (stock/fund/crypto) → switch `1M / 6M / 1Y / ALL` and confirm Price History updates
- [ ] **Market open/closed indicator**
  - Open a listed asset detail and confirm market status shows “open/closed” + timing detail
- [ ] **AI Snapshot (OpenAI)**
  - If OpenAI key is configured: open Premium Analysis → Generate snapshot → confirm 3–5 bullets
  - If key is missing: confirm it shows “unavailable” without crashing
