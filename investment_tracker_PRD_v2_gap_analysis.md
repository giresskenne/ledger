# Investment Tracker PRD v2 — Gap Analysis (as of 2026-01-28)

PRD source: `investment_tracker_PRD_v2_prioritized.md`  
Code snapshot: `analysis/prd-v2-gap-2026-01-28` @ `a3680f54f4b5821517c5c39e30d4eca1f6e0b5a2`

## What’s Already Implemented (High-Level)

- Asset CRUD flows exist: add, edit, view detail, delete (`src/app/add-asset.tsx`, `src/app/edit-asset/[id].tsx`, `src/app/asset/[id].tsx`).
- Supports many asset categories and a manual-vs-listed split (`src/lib/types.ts`, `src/lib/store.ts`).
- Live/cached pricing exists for:
  - Stocks/funds via Stooq (native) with Alpha Vantage fallback
  - Crypto via Alpha Vantage
  (`src/lib/market-data/*`, used in `src/app/(tabs)/holdings.tsx`).
- Dashboard + Holdings list exist with allocation summaries and basic concentration warnings (`src/app/(tabs)/index.tsx`, `src/app/(tabs)/holdings.tsx`).
- Events timeline exists (in-app “notification center”) + local scheduling hook (`src/app/(tabs)/events.tsx`, `src/lib/notifications-store.ts`, `src/lib/local-notifications.ts`).
- Premium scaffolding exists:
  - Free tier asset cap (10)
  - Paywall + RevenueCat integration
  - Analysis tab gated behind premium
  (`src/app/premium.tsx`, `src/lib/premium-store.ts`, `src/lib/revenuecatClient.ts`, `src/app/(tabs)/analysis.tsx`).
- Settings, themes, privacy/terms/disclaimer screens exist (`src/app/(tabs)/settings.tsx`, `src/lib/theme-store.tsx`, `src/app/privacy.tsx`, `src/app/terms.tsx`, `src/app/disclaimer.tsx`).
- Optional biometric gate exists (`src/components/BiometricGate.tsx`, `src/lib/biometrics-store.ts`).

---

## Missing / Pending Work (Compared to PRD)

### [MUST] Core MVP Requirements

- [ ] **First-launch disclaimer requirement**: PRD requires a disclaimer shown on first launch (and ideally stored as “accepted”). A disclaimer screen exists but is not enforced on first launch (`src/app/disclaimer.tsx`).
- [ ] **Manual valuation history tracking**: manual assets should support “manual valuation input with historical tracking”.
  - `valueHistory` exists, but “Update Value” does not append a dated entry, so the history is effectively not captured (`src/app/asset/[id].tsx`, `src/lib/store.ts`).
- [ ] **Performance monitoring options**:
  - [ ] Time period selector: `1M / 6M / 1Y / All Time / Since Inception`
  - [ ] Toggle absolute vs % returns
  - [ ] Option to hide performance metrics entirely
  - [ ] Clear labeling for manual-asset performance
  (Currently: only basic gain calculations; no time-series performance UI.)
- [ ] **Dashboard charts + interactivity**:
  - [ ] Asset class allocation (pie chart)
  - [ ] Country allocation (bar chart with flags)
  - [ ] Sector allocation (treemap for listed assets)
  - [ ] Tap-to-filter / drill-down interactions
  (Currently: list-style allocations and a simple stacked bar.)
- [ ] **Listed-asset detail requirements**:
  - [ ] Show data source attribution + last update timestamp
  - [ ] Market hours status (open/closed)
  - [ ] Historical price chart + time selector
  (Currently: basic detail + link-out; no embedded chart.)
- [ ] **Manual fixed-income detail requirements**:
  - [ ] Amortization schedule view
  - [ ] Principal vs interest breakdown
  (Currently: maturity date + interest rate fields only.)
- [ ] **Free vs Premium behavior alignment**:
  - PRD states free users get *count-only* concentration warnings (no details), while premium users get detailed breakdowns and insights.
  - Current dashboard shows detailed concentration info (e.g., “X% in US”) even when not premium.
- [ ] **Risk & Diversification analysis compliance**:
  - PRD explicitly forbids prescriptive/allocative language (no “consider adding 5–10%”, no recommendations).
  - Current premium analysis includes prescriptive “suggestions” and uses red/green semantics in places (`src/app/(tabs)/analysis.tsx`).
- [ ] **Local-first data architecture per PRD**:
  - PRD calls for SQLite/Realm. Current portfolio persistence is primarily Zustand + AsyncStorage (`src/lib/store.ts`).
  - Decide whether to (a) migrate to `expo-sqlite`/Realm, or (b) formally accept AsyncStorage for MVP and update PRD expectations.
- [ ] **Authentication**:
  - PRD “Period 1” includes authentication. Current app has onboarding + optional biometrics gate, but no user auth/account model.
  - Decide scope: “local-only auth” (biometrics/passcode) vs account sign-in.

### [SHOULD] Notifications & Timeline

- [ ] **Maturity notifications cadence**: PRD calls for maturity reminders at `7/30/90` days; current scheduling supports a single `maturityDaysBefore` value + day-of reminder (`src/lib/local-notifications.ts`, `src/lib/notifications-store.ts`).
- [ ] **Stale manual valuation reminders** (optional, user-configured) — not present.
- [ ] **Amortization milestone events** — not present.
- [ ] **Timeline calendar view**: PRD calls for a calendar view + list view; current Events screen is list-first (no calendar view).

### [SHOULD] Market Data & Data Freshness UX

- [ ] **Data freshness copy**: PRD calls for “Updated 5 minutes ago” and “Last updated [date]”; current UI shows basic “Live/Cached/Manual” but not “time since” indicators.
- [ ] **Commodity prices (gold/silver)**: PRD lists commodities as auto-updated; current implementation treats gold/physical metals as manual.
- [ ] **Currency conversion support**: PRD includes currency conversion APIs and multi-currency considerations; current app stores per-asset currency but doesn’t consistently convert/aggregate across currencies.
- [ ] **Source attribution UI**: attribution components exist but aren’t surfaced where prices are shown (`src/components/DataAttribution.tsx` is mostly unused).

### [COULD] Post‑MVP / Stretch (From PRD)

- [ ] Widgets (iOS/Android) for net worth display.
- [ ] Cloud backup (encrypted) and restore flows.
- [ ] Multi-currency portfolio base currency + exposure analysis.
- [ ] AI-powered insights (explicitly called “post-MVP” in PRD Future Enhancements).

---

## Notes / Decisions Needed (Before Implementation)

- Define what “authentication” means for this MVP (local-only vs real user accounts).
- Decide whether SQLite/Realm is a hard requirement for this release, or if AsyncStorage is acceptable for Shipyard MVP.
- Decide the market-data scope for MVP:
  - Keep listed assets limited to stocks/funds/crypto, or add commodities (gold/silver) auto-pricing.
- Align Risk Analysis copy with the PRD’s “monitoring/insight only” positioning (neutral tone, no target allocations).

