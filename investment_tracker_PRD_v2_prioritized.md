# Product Requirements Document (PRD)
## Unified Investment Tracker App

### Version
v2.0 – Enhanced MVP Specification

### Author
Product Team

### Status
Ready for Development

---

> **Delivery Priority Legend**
> - **[MUST]** = Required for Shipyard MVP & judging
> - **[SHOULD]** = High-value if time allows, not blocking
> - **[COULD]** = Explicitly post-MVP / stretch
> - **[REFERENCE]** = Informational only

---

## 1. Objective [MUST]

Build a **mobile investment tracking application** that allows users to **list, monitor, and analyze all their investments in one place**, regardless of platform, structure, or asset type.

The app's purpose is **monitoring and insight**, not trading or financial advice.

---

## 2. Problem Statement [MUST]

Modern investors hold assets across:
- Multiple platforms
- Different asset classes
- Various legal and financial structures

This fragmentation makes it difficult to:
- Track overall performance
- Understand diversification
- Identify concentration risk
- Monitor maturity and amortization timelines

Existing tools fail to support **non-listed and real-world assets** in a structured way.

---

## 3. Goals & Success Criteria [MUST]

### Goals
- Provide a **single source of truth** for all investments
- Offer **real-time or scheduled performance updates**
- Deliver **portfolio risk & diversification insights**
- Support both **listed and non-listed assets**
- Enable **premium monetization via analytics**

### Success Criteria
- User can add any investment in under 30 seconds
- User sees net worth and exposure instantly
- Risk insights are understandable without financial expertise
- MVP is fully functional within 4 Periods

---

## 4. Target Users [MUST]

- Retail investors
- Long-term investors
- Users with assets spread across:
  - Brokers
  - Platforms
  - Physical holdings
  - Private or fixed-income products

---

## 5. Core Features [MUST]

### 5.1 Asset Aggregation [MUST]

Users must be able to list **all investments**, including:

#### Listed Assets (Auto-updated)
- Stocks
- ETFs
- Cryptocurrencies
- Commodities (Gold, Silver)

#### Non-Listed Assets (Manual Entry)
- Fixed income products
- Real estate
- Private investments
- Interest-bearing accounts
- Physical assets (e.g. silver, gold)

The system must:
- Distinguish between **auto-priced** and **manual** assets
- Allow coexistence within the same portfolio
- Display data freshness indicators:
  - "Updated 5 minutes ago" for listed assets
  - "Last updated [date]" for manual assets
  - Market status (open/closed) for listed assets

---

### 5.2 Performance Monitoring [MUST]

#### Listed Assets
- Price updated via market data APIs
- Performance calculated automatically
- Source attribution displayed

#### Non-Listed Assets
- Manual valuation input with historical tracking
- Scheduled value updates
- Amortization and maturity tracking
- Performance shown as "Since inception" or absolute value change

#### Performance Display Options
- Time period selector: 1M, 6M, 1Y, All Time, Since Inception
- Toggle between absolute returns and percentage returns
- Option to hide performance metrics entirely
- Clear labeling for manual asset performance

---

### 5.3 Portfolio Dashboard [MUST]

The dashboard must display:
- Total net worth (large, prominent)
- Asset allocation by class (pie chart)
- Allocation by country (bar chart with flag icons)
- Allocation by sector (treemap for listed assets)
- Performance overview (with time period selector)

**Dashboard Components:**
- Pull-to-refresh for listed asset prices
- Floating "Add Asset" button (FAB)
- Subtle concentration risk indicators (for premium users)
- Quick stats: Total assets, Last updated timestamp

**Visuals:**
- Pie charts for asset class allocation
- Bar charts for country exposure
- Treemap for sector exposure
- Percentage indicators with values

**Interactivity:**
- Tap charts to filter/drill-down
- Tap warnings to see detailed risk analysis
- Swipe between time periods

---

### 5.4 Notifications & Timeline [SHOULD]

Users must receive notifications for:
- Upcoming maturity dates (7 days, 30 days, 90 days notice)
- Amortization milestones
- Stale manual valuations (optional, user-configured)

**Timeline/Events Screen:**
- Calendar view of upcoming events
- List view of past and future milestones
- In-app notification center
- Badge indicators on dashboard when events are approaching

---

### 5.5 Asset Detail Screen [MUST]

Each asset has a dedicated detail view showing:

#### For All Assets:
- Asset name & type
- Current value
- Portfolio allocation %
- "Edit" or "Update Value" button
- Delete asset option

#### For Listed Assets:
- Current price and price source
- Performance chart (with time selector)
- Historical price data
- Market hours status
- Last price update timestamp

#### For Manual Assets:
- Value history chart/timeline
- "Update Value" button (prominent)
- Historical manual valuations with dates
- For fixed income: 
  - Maturity date countdown
  - Amortization schedule view
  - Interest/coupon rate
  - Principal vs. interest breakdown
- Notes field

---

### 5.6 Risk & Diversification Analysis (Premium Feature) [MUST]

The system must analyze:
- Country exposure (e.g. overexposure to US)
- Sector exposure (e.g. heavy tech concentration)
- Asset class concentration
- Historical exposure trends

**Concentration Risk Thresholds:**
- Single country > 60%: Warning
- Single sector > 40%: Warning
- Single asset > 25%: Warning

**Risk Insights Display:**
- Text-based insight cards
- "Learn more" expandable sections
- Historical exposure trend charts
- Neutral warning indicators (no red/green)

**Example Insights:**
- "Your portfolio is heavily exposed to US equities. Consider diversifying across other regions or asset classes to reduce systemic risk."
- "Technology sector represents 45% of your listed assets. This concentration may increase volatility."

⚠️ The app must NOT:
- Recommend specific securities
- Provide buy/sell advice
- Suggest target percentages
- Use prescriptive language

**Free vs. Premium:**
- **Free:** Basic concentration warnings on dashboard (count only, no details)
- **Premium:** Full risk analysis, country/sector breakdown, historical trends, detailed insights

---

## 6. User Interface Specifications [MUST]

### 6.1 Design Principles [MUST]
- Calm, premium, finance-grade aesthetic
- Clean typography, strong hierarchy
- Neutral colors (dark and light theme support)
- Avoid flashy charts or gambling vibes
- "Institutional but friendly" tone

### 6.2 Visual Design System [SHOULD]

### 6.3 Screen Specifications [MUST]

#### Screen 1: Onboarding [MUST]

## 7. Monetization [MUST]

### Free Tier
- Up to 10 assets
- Basic dashboard
- Manual asset tracking
- Basic concentration warnings (count only)

### Premium Tier (RevenueCat)
- Unlimited assets
- Full diversification & risk analysis
- Country & sector exposure insights with detailed breakdowns
- Historical trend analysis
- Notifications for asset maturity and events
- Priority support

**Pricing:** $X.XX/month or $XX.XX/year (TBD based on market research)

---

## 8. Non-Goals [MUST]

The app will NOT:
- Execute trades
- Connect to brokerage accounts (no OAuth/API integration)
- Handle user funds
- Offer financial or tax advice
- Provide automated portfolio rebalancing
- Show real-time streaming prices (delayed data is acceptable)

---

## 9. Compliance & Legal Considerations [MUST]

- App is **informational only**
- No custody of funds
- No KYC / AML requirements
- No financial advisory role

**Required Disclaimer (displayed on first launch):**
"This application is for informational purposes only and does not constitute financial, investment, or tax advice. Always consult with a qualified professional before making investment decisions."

**Data Privacy:**
- All data stored locally or on user's cloud account
- No sharing of portfolio data with third parties
- Optional anonymous analytics for app improvement

---

## 10. Technical Considerations [MUST]

### Data Architecture
- Local-first storage (SQLite or Realm)
- Optional cloud backup (encrypted)
- API-agnostic architecture for market data

### Market Data APIs (Optional Third-Party Dependencies)
- Stock/ETF data: Alpha Vantage, IEX Cloud, or similar
- Crypto data: CoinGecko, CryptoCompare
- Commodity prices: Public commodity APIs
- Currency conversion: Exchange rate APIs

**Requirements:**
- Must be replaceable
- Fail gracefully with manual fallback
- Clear labeling of data sources
- Caching to reduce API calls

### Performance Requirements
- Dashboard loads in < 2 seconds
- Asset addition completes in < 30 seconds
- Smooth 60fps scrolling and chart animations
- Offline mode with last-known data

### Platform-Specific Considerations
- **iOS:** Widgets for net worth display
- **Android:** Home screen widgets, notification channels
- **Both:** Dark mode support, accessibility (VoiceOver/TalkBack)

---

## 11. MVP Scope (4 Periods) [MUST]

**Period 1: Foundation**
- Authentication & onboarding flow
- Database schema & local storage
- Basic navigation structure
- Asset creation flows (both types)

**Period 2: Core Features**
- Dashboard with charts (placeholder data)
- Portfolio list view
- Asset detail screens
- Manual asset logic & value history

**Period 3: Premium Features**
- Risk analysis engine (basic algorithms)
- Country/sector exposure calculations
- RevenueCat integration & paywall
- Notification system for maturities

**Period 4: Polish & Launch**
- UX refinements & animations
- Empty states & error handling
- Demo/sample data for onboarding
- App store assets & submission
- Beta testing & bug fixes

---

## 12. Success Metrics (Post-Launch) [SHOULD]

### Engagement Metrics
- Daily Active Users (DAU)
- Average session duration
- Assets added per user
- Dashboard views per session

### Conversion Metrics
- Free-to-Premium conversion rate (target: 5-10%)
- Trial-to-paid conversion rate
- Churn rate (target: < 10% monthly)

### Product Metrics
- Time to add first asset (target: < 2 minutes)
- Assets per user (free vs. premium)
- Feature usage (risk analysis views, timeline views)

---

## 13. Future Enhancements (Post-MVP) [COULD]

**Phase 2 (6-12 months):**
- Tax loss harvesting insights (premium)
- Multi-currency support
- Portfolio sharing (view-only links)
- Collaborative portfolios (family/advisor access)
- Advanced charts (correlation, efficient frontier)

**Phase 3 (12+ months):**
- Brokerage connection (read-only via Plaid or similar)
- AI-powered insights (natural language explanations)
- Document storage (PDFs, statements)
- Scenario modeling ("What if" calculator)

---

## 14. Key Value Proposition [MUST]

**A single, clean, professional app that finally lets investors:**
- **See everything** – Listed and manual assets in one place
- **Understand their risk** – Clear, non-prescriptive insights
- **Stay in control** – Track maturities, amortization, and portfolio health
- **Feel confident** – Institutional-grade tools for everyday investors

**Tagline:** "All your investments. One clear view."

---

## Appendix A: Glossary [REFERENCE]

- **Listed Asset:** Securities with public market prices (stocks, ETFs, crypto)
- **Manual Asset:** User-valued assets (real estate, fixed income, private investments)
- **Concentration Risk:** Overexposure to single country, sector, or asset
- **Amortization:** Scheduled reduction of debt/investment principal over time
- **Maturity Date:** Date when fixed-income investment principal is repaid

---

## Appendix B: Open Questions [REFERENCE]

1. What is the optimal free tier asset limit? (Testing 5-10 range)
2. Should we support fractional shares for stocks/crypto?
3. Do we need currency hedging analysis for international assets?
4. Should performance include dividends/distributions?
5. What level of historical data should be stored (1 year, all-time)?

---

**End of Document**

---

*This PRD is a living document and will be updated based on user feedback, technical constraints, and market conditions.*