# PRD Section — Premium Feature: Registered Account Room Tracker (CA/US/UK)

**Feature Codename:** `ROOMS`
**Applies to:** Unified Investment Tracker App (“Ledger”) — Premium tier
**Last verified:** 2026-01-19 (see Official Sources)

---

## 1) Objective

Enable premium users to:

1. Track **tax-advantaged / registered account contribution room** (“remaining room”) by country.
2. See **monthly / per-paycheck savings targets** needed to fully use remaining room by the tax-year deadline.
3. Store room and contributions per account to support dashboards, alerts, and planning.

This feature is **informational only** and must not provide investment or tax advice.

---

## 2) Supported Jurisdictions & Accounts (MVP)

### Canada (CRA)

* **TFSA** — annual TFSA dollar limit; lifetime cumulative room; room effects from withdrawals.
* **RRSP/REER** — RRSP *dollar limit* and “lesser of 18% of prior-year earned income or annual max” rule; user-provided official override.
* **FHSA** — annual participation room and lifetime limit.

**2026 Canada values (MVP defaults)**

* TFSA annual dollar limit (2026): **CAD 7,000**
* RRSP dollar limit (2026): **CAD 33,810**
* FHSA: annual participation room **CAD 8,000**; lifetime limit **CAD 40,000**

### United States (IRS)

* **IRA (Traditional & Roth)** — annual IRA contribution limit; catch-up; Roth income phase-out ranges (display-only).
* **401(k)/403(b)/457/TSP** — elective deferral limit; catch-up; age 60–63 special catch-up.

**2026 US values (MVP defaults)**

* 401(k)/403(b)/457/TSP elective deferral limit (2026): **USD 24,500**
* Catch-up (age 50+): **USD 8,000** (general)
* Special catch-up (age 60–63): **USD 11,250**
* IRA annual contribution limit (2026): **USD 7,500**
* IRA catch-up (age 50+): **USD 1,100**
* Roth IRA income phase-out ranges (2026) (display-only):

  * Single/Head of Household: **$153,000–$168,000**
  * Married Filing Jointly: **$242,000–$252,000**
  * Married Filing Separately: **$0–$10,000**

### United Kingdom (GOV.UK)

* **ISA** — annual subscription limit across adult ISAs; UK tax year definition.
* **Lifetime ISA (LISA)** — annual payment limit; government bonus; age rules.
* **Pension (Workplace / SIPP)** — annual allowance (standard).

**2025/26 UK tax year values (MVP defaults)**

* UK tax year: **6 April → 5 April**
* ISA annual allowance (adult): **GBP 20,000** per tax year
* Lifetime ISA: pay in up to **GBP 4,000** per year; **25% bonus** (max **GBP 1,000** bonus/year); counts toward ISA limit
* Pension annual allowance (standard): **GBP 60,000** per tax year

> Note: “Closest equivalent” accounts vary by personal circumstances. The app must label them as “closest equivalents” and provide source links.

---

## 3) Premium Value Proposition

Premium users get:

* Remaining room per account (with progress bars)
* Room forecasts & “save-to-max” calculators
* Alerts: “on track / behind” and “tax year ends soon”
* Cross-country comparisons (useful for expats/new residents)

Free users see:

* Locked room details + teaser (“Track TFSA/RRSP/ISA room with Premium”)

---

## 4) User Stories

1. As a Canadian user, I want to see TFSA room and how much I must save monthly to max it by Dec 31.
2. As a US user, I want to see IRA and 401(k) limits for my age and my remaining room after contributions.
3. As a UK user, I want to see ISA/LISA room using the UK tax year (6 Apr–5 Apr), not calendar year.
4. As any user, I want to input my “official room” value when rules are complex (e.g., RRSP).
5. As a premium user, I want alerts when I’m likely to miss maxing my room at my current savings rate.

---

## 5) Data Model (Product Requirements)

### Core entities

* **JurisdictionProfile**

  * `country_code` (CA/US/UK)
  * `tax_residency_start_date` (optional)
  * `tax_year_type` (calendar vs UK tax year)
  * `filing_status` (US-only; used for Roth phaseout display)
  * `birth_date` (optional; used for catch-up eligibility)

* **AccountRoom**

  * `account_type` (TFSA, RRSP, FHSA, IRA, 401K, ISA, LISA, PENSION)
  * `tax_year_id` (e.g., `CA_2026`, `US_2026`, `UK_2025_2026`)
  * `annual_limit` (numeric + currency)
  * `lifetime_limit` (nullable)
  * `carry_forward_supported` (bool + notes)
  * `official_room_override` (nullable numeric)
  * `limit_source` (“official_rule” | “user_override”)
  * `computed_at` timestamp

* **ContributionLedger**

  * contribution records: date, amount, account_type, tax_year_id, source (manual/import)
  * computed `contributions_in_tax_year` per account_type + tax_year_id

### Important concept: “Computed room” vs “Official room”

Some accounts have interactions the app cannot fully derive (e.g., RRSP deduction limit depends on prior-year income + pension adjustments, etc.). The app must:

* compute an estimated limit
* allow user to override with an “official” value they enter from official notices/statements
* clearly label when a value is “Estimated” vs “Official (user-entered)”

---

## 6) Rules & Calculations (MVP)

### 6.1 Remaining room

For each account:

* `effective_limit = official_room_override ?? computed_limit`
* `remaining_room = max(0, effective_limit - contributions_in_tax_year)`

### 6.2 Savings target calculator

Inputs:

* remaining_room
* deadline (tax year end)
* user pay frequency (monthly / biweekly / weekly)

Outputs:

* amount per period needed to fully use remaining room

Example:

* `periods_left = count_periods(now → tax_year_end, frequency)`
* `per_period_target = remaining_room / periods_left`

### 6.3 Tax year boundaries

* **Canada:** calendar year (Jan 1–Dec 31)
* **US:** calendar year (Jan 1–Dec 31)
* **UK:** tax year (Apr 6–Apr 5) — must be used for ISA/LISA/Pension

### 6.4 Eligibility & thresholds (display-only)

* **Roth IRA:** show income phase-out ranges by filing status (display-only).
* **LISA:** show age constraints and bonus rules.
* **Pension annual allowance:** show standard allowance and link that tapering may apply.

---

## 7) UX Requirements

### 7.1 Premium Screen: “Registered Accounts”

Cards per account:

* Account name + country badge
* Annual limit + contributions + remaining room
* Progress bar
* “Save-to-max” row:

  * “Save **{currency}{per_period} / {period}** to max out by {tax_year_end}”
* Small “source” link (official page)

### 7.2 Data entry

* Add contributions manually (date, amount, account)
* Optional: “Set official room” field (tooltip: “Use your tax notice/statement”)

### 7.3 Notifications (Premium)

* 60 / 30 / 7 days before tax year end: “You have {currency}{remaining} room left in {account}”
* “Behind schedule”: if projected contributions at current pace < remaining_room

---

## 8) Non-Goals (MVP)

* No brokerage linking / tax filing integration
* No automated tax optimization suggestions
* No “which account should you use” recommendations
* No legal/tax advice

---

## 9) Compliance & Copy

Mandatory disclaimer on this feature screen:

> “Informational only. Contribution limits and eligibility can vary by individual situation. Verify with official tax authorities or a qualified professional.”

Avoid prescriptive language (“you should contribute”) — use neutral phrasing (“to fully use your remaining room…”).

---

## 10) Official Sources (must be used in-app)

**Canada (CRA)**

* TFSA 2026 dollar limit and room calculation guidance: [https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html)
* RRSP 2026 dollar limit table: [https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html)
* RRSP deduction limit rule (lesser of 18% of earned income and annual max): [https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html)
* FHSA overview (participation room): [https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html)

**United States (IRS)**

* 2026 401(k) and IRA limits + Roth income phase-outs: [https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)

**United Kingdom (GOV.UK)**

* ISA annual allowance and tax year definition: [https://www.gov.uk/individual-savings-accounts/how-isas-work](https://www.gov.uk/individual-savings-accounts/how-isas-work)
* Lifetime ISA overview (limit + 25% bonus): [https://www.gov.uk/lifetime-isa](https://www.gov.uk/lifetime-isa)
* Pension annual allowance (and UK tax year definition): [https://www.gov.uk/tax-on-your-private-pension/annual-allowance](https://www.gov.uk/tax-on-your-private-pension/annual-allowance)

---

## 11) Acceptance Criteria

1. User selects residency country (CA/US/UK) and sees relevant accounts.
2. Limits shown match official sources for the selected tax year.
3. Remaining room updates instantly when a contribution is added/edited/deleted.
4. UK accounts use Apr 6–Apr 5 tax year boundaries.
5. User can override “official room” and remaining room recalculates.
6. Savings targets update based on pay frequency and time remaining.
7. Feature is paywalled for non-premium users.

---

## 12) Open Questions (for later iterations)

* Carry-forward + withdrawal-based room adjustments beyond MVP (TFSA withdrawals, FHSA carryforward rules, pension tapering).
* Import contributions from files (CSV) or read-only integrations.
* Add more countries (AU Super, etc.).
