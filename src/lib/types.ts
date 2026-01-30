/**
 * Shared domain types and static config (assets, jurisdictions, and registered account definitions).
 * `ACCOUNT_CONFIGS` is the single source of truth for what registered accounts exist and how they render.
 */
// Investment Types
export type AssetCategory =
  | 'stocks'
  | 'bonds'
  | 'funds'
  | 'gold'
  | 'real_estate'
  | 'crypto'
  | 'fixed_income'
  | 'derivatives'
  | 'physical_metals'
  | 'cash';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BRL' | 'CHF';

// Transaction types for listed assets
export type TransactionType = 'BUY';

export interface AssetTransaction {
  id: string;
  type: TransactionType;
  date: string;        // ISO string
  quantity: number;
  price: number;       // per unit
  fees?: number;       // optional, default 0
}

// Popular brokers and platforms worldwide
export const POPULAR_BROKERS = [
  // US Brokers
  'Fidelity',
  'Charles Schwab',
  'Vanguard',
  'TD Ameritrade',
  'E*TRADE',
  'Robinhood',
  'Webull',
  'Interactive Brokers',
  'Merrill Edge',
  'Ally Invest',

  // Canadian Brokers
  'Wealthsimple',
  'Questrade',
  'TD Direct Investing',
  'RBC Direct Investing',
  'BMO InvestorLine',
  'CIBC Investor\'s Edge',
  'Scotiabank iTRADE',
  'National Bank Direct Brokerage',

  // UK Brokers
  'Hargreaves Lansdown',
  'AJ Bell',
  'Interactive Investor',
  'Trading 212',
  'Freetrade',
  'eToro',
  'IG',
  'Saxo Markets',

  // European Brokers
  'Degiro',
  'Scalable Capital',
  'Trade Republic',
  'Revolut',
  'N26',

  // Crypto Exchanges
  'Coinbase',
  'Binance',
  'Kraken',
  'Gemini',
  'Crypto.com',
  'Bitstamp',

  // Banks
  'Bank of America',
  'Chase',
  'Wells Fargo',
  'Citi',
  'HSBC',
  'Barclays',

  // Other
  'Other',
] as const;

// Sector types for listed assets
export type Sector =
  | 'technology'
  | 'healthcare'
  | 'financials'
  | 'consumer_discretionary'
  | 'consumer_staples'
  | 'industrials'
  | 'energy'
  | 'utilities'
  | 'materials'
  | 'real_estate'
  | 'communication_services'
  | 'other';

// Country/Region codes
export type CountryCode =
  | 'US'
  | 'CA'
  | 'UK'
  | 'DE'
  | 'FR'
  | 'JP'
  | 'CN'
  | 'AU'
  | 'BR'
  | 'CH'
  | 'GLOBAL'
  | 'EMERGING'
  | 'OTHER';

export interface Asset {
  id: string;
  name: string;
  ticker?: string;
  category: AssetCategory;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  currency: Currency;
  // Optional registered-account tag (e.g., "this holding was bought inside a TFSA").
  // `null`/`undefined` means "taxable / unregistered".
  heldIn?: RegisteredAccountType | null;
  // Sector and country for analytics
  sector?: Sector;
  country?: CountryCode;
  countryName?: string; // used when country === 'OTHER'
  // For fixed income / bonds
  maturityDate?: string;
  interestRate?: number;
  // For real estate
  address?: string;
  // Optional recurring monthly contributions (e.g., DCA / savings)
  recurringContribution?: {
    enabled: boolean;
    frequency: PayFrequency;
    // Monthly schedule: 1-28
    dayOfMonth?: number;
    // Weekly/Biweekly schedule: 0=Sun ... 6=Sat
    weekday?: number;
    amount: number;
    autoApply: boolean;
    lastAppliedId?: string; // monthly: YYYY-MM, else YYYY-MM-DD
    lastValidatedId?: string; // monthly: YYYY-MM, else YYYY-MM-DD
  };
  // For manual tracking
  isManual: boolean;
  lastUpdated: string;
  // Platform/Broker info
  platform?: string;
  notes?: string;
  // Value history for manual assets
  valueHistory?: { date: string; value: number }[];
  // Transaction history for listed assets (stocks, funds, crypto)
  transactions?: AssetTransaction[];
  // Flag for estimated cost basis (when user doesn't know purchase details)
  costBasisEstimated?: boolean;
}

// Sector display info
export const SECTOR_INFO: Record<Sector, { label: string; color: string }> = {
  technology: { label: 'Technology', color: '#6366F1' },
  healthcare: { label: 'Healthcare', color: '#10B981' },
  financials: { label: 'Financials', color: '#F59E0B' },
  consumer_discretionary: { label: 'Consumer Discretionary', color: '#EC4899' },
  consumer_staples: { label: 'Consumer Staples', color: '#8B5CF6' },
  industrials: { label: 'Industrials', color: '#64748B' },
  energy: { label: 'Energy', color: '#EF4444' },
  utilities: { label: 'Utilities', color: '#14B8A6' },
  materials: { label: 'Materials', color: '#A3A3A3' },
  real_estate: { label: 'Real Estate', color: '#F97316' },
  communication_services: { label: 'Communication', color: '#3B82F6' },
  other: { label: 'Other', color: '#6B7280' },
};

// Country display info
export const COUNTRY_INFO: Record<CountryCode, { name: string; flag: string; color: string }> = {
  US: { name: 'United States', flag: '🇺🇸', color: '#3B82F6' },
  CA: { name: 'Canada', flag: '🇨🇦', color: '#EF4444' },
  UK: { name: 'United Kingdom', flag: '🇬🇧', color: '#6366F1' },
  DE: { name: 'Germany', flag: '🇩🇪', color: '#F59E0B' },
  FR: { name: 'France', flag: '🇫🇷', color: '#3B82F6' },
  JP: { name: 'Japan', flag: '🇯🇵', color: '#EF4444' },
  CN: { name: 'China', flag: '🇨🇳', color: '#DC2626' },
  AU: { name: 'Australia', flag: '🇦🇺', color: '#10B981' },
  BR: { name: 'Brazil', flag: '🇧🇷', color: '#22C55E' },
  CH: { name: 'Switzerland', flag: '🇨🇭', color: '#EF4444' },
  GLOBAL: { name: 'Global', flag: '🌍', color: '#8B5CF6' },
  EMERGING: { name: 'Emerging Markets', flag: '🌏', color: '#F97316' },
  OTHER: { name: 'Other', flag: '🏳️', color: '#6B7280' },
};

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface AllocationData {
  category: AssetCategory;
  value: number;
  percentage: number;
  color: string;
}

export interface RiskAnalysis {
  overallRiskScore: number; // 1-10
  sectorConcentration: ConcentrationRisk[];
  geographicConcentration: ConcentrationRisk[];
  assetTypeConcentration: ConcentrationRisk[];
  suggestions: string[];
}

export interface ConcentrationRisk {
  name: string;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// Category display info
export const CATEGORY_INFO: Record<AssetCategory, { label: string; icon: string; color: string }> = {
  stocks: { label: 'Stocks', icon: 'TrendingUp', color: '#10B981' },
  bonds: { label: 'Bonds', icon: 'FileText', color: '#6366F1' },
  funds: { label: 'Funds', icon: 'PieChart', color: '#8B5CF6' },
  gold: { label: 'Gold', icon: 'Circle', color: '#F59E0B' },
  real_estate: { label: 'Real Estate', icon: 'Home', color: '#EC4899' },
  crypto: { label: 'Crypto', icon: 'Coins', color: '#F97316' },
  fixed_income: { label: 'Fixed Income', icon: 'Landmark', color: '#14B8A6' },
  derivatives: { label: 'Derivatives', icon: 'Activity', color: '#EF4444' },
  physical_metals: { label: 'Physical Metals', icon: 'Diamond', color: '#A3A3A3' },
  cash: { label: 'Cash', icon: 'Wallet', color: '#22C55E' },
};

// ============================================
// REGISTERED ACCOUNT ROOM TRACKER TYPES
// ============================================

export type JurisdictionCode = 'CA' | 'US' | 'UK';

export type CanadianAccountType = 'TFSA' | 'RRSP' | 'FHSA' | 'RESP';
export type USAccountType = 'IRA' | '401K' | 'ROTH_IRA' | 'PLAN_529';
export type UKAccountType = 'ISA' | 'LISA' | 'PENSION' | 'JISA';

export type RegisteredAccountType = CanadianAccountType | USAccountType | UKAccountType;

export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

export type FilingStatus = 'single' | 'married_jointly' | 'married_separately' | 'head_of_household';

export interface JurisdictionProfile {
  countryCode: JurisdictionCode;
  taxResidencyStartDate?: string;
  birthDate?: string;
  filingStatus?: FilingStatus; // US only
}

export interface Contribution {
  id: string;
  accountType: RegisteredAccountType;
  taxYearId: string;
  amount: number;
  currency: Currency;
  date: string;
  source: 'manual' | 'import';
  notes?: string;
}

export interface AccountRoom {
  accountType: RegisteredAccountType;
  taxYearId: string;
  annualLimit: number;
  lifetimeLimit?: number;
  currency: Currency;
  carryForwardSupported: boolean;
  carryForwardNotes?: string;
  officialRoomOverride?: number;
  limitSource: 'official_rule' | 'user_override';
  computedAt: string;
}

export interface SavingsTarget {
  accountType: RegisteredAccountType;
  remainingRoom: number;
  periodsLeft: number;
  perPeriodTarget: number;
  frequency: PayFrequency;
  taxYearEndDate: string;
}

// Account configuration info
export interface AccountTypeConfig {
  type: RegisteredAccountType;
  name: string;
  shortName: string;
  description: string;
  jurisdiction: JurisdictionCode;
  color: string;
  icon: string;
  annualLimit2026: number;
  lifetimeLimit?: number;
  catchUpAge?: number;
  catchUpAmount?: number;
  specialCatchUpAge?: { min: number; max: number };
  specialCatchUpAmount?: number;
  sourceUrl: string;
  taxYearType: 'calendar' | 'uk_tax_year';
}

// Roth IRA income phase-out ranges (display only)
export interface RothPhaseOutRange {
  filingStatus: FilingStatus;
  minIncome: number;
  maxIncome: number;
}

export const ROTH_PHASEOUT_2026: RothPhaseOutRange[] = [
  { filingStatus: 'single', minIncome: 153000, maxIncome: 168000 },
  { filingStatus: 'head_of_household', minIncome: 153000, maxIncome: 168000 },
  { filingStatus: 'married_jointly', minIncome: 242000, maxIncome: 252000 },
  { filingStatus: 'married_separately', minIncome: 0, maxIncome: 10000 },
];

// Jurisdiction display info
export const JURISDICTION_INFO: Record<JurisdictionCode, {
  name: string;
  flag: string;
  currency: Currency;
  taxYearType: 'calendar' | 'uk_tax_year';
  taxYearLabel: string;
}> = {
  CA: {
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'USD', // Will show CAD conceptually
    taxYearType: 'calendar',
    taxYearLabel: 'Jan 1 - Dec 31',
  },
  US: {
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    taxYearType: 'calendar',
    taxYearLabel: 'Jan 1 - Dec 31',
  },
  UK: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    taxYearType: 'uk_tax_year',
    taxYearLabel: 'Apr 6 - Apr 5',
  },
};

// Account type configurations with 2026 limits
export const ACCOUNT_CONFIGS: AccountTypeConfig[] = [
  // Canada
  {
    type: 'TFSA',
    name: 'Tax-Free Savings Account',
    shortName: 'TFSA',
    description: 'Tax-free growth and withdrawals. Unused room carries forward.',
    jurisdiction: 'CA',
    color: '#10B981',
    icon: 'Leaf',
    annualLimit2026: 7000,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html',
  },
  {
    type: 'RRSP',
    name: 'Registered Retirement Savings Plan',
    shortName: 'RRSP',
    description: 'Tax-deferred retirement savings. Limit is lesser of 18% of prior-year income or annual max.',
    jurisdiction: 'CA',
    color: '#6366F1',
    icon: 'Landmark',
    annualLimit2026: 33810,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html',
  },
  {
    type: 'FHSA',
    name: 'First Home Savings Account',
    shortName: 'FHSA',
    description: 'Tax-free savings for first home purchase. Participation room.',
    jurisdiction: 'CA',
    color: '#EC4899',
    icon: 'Home',
    annualLimit2026: 8000,
    lifetimeLimit: 40000,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html',
  },
  {
    type: 'RESP',
    name: 'Registered Education Savings Plan',
    shortName: 'RESP',
    description: 'Education savings plan (Canada). Contributions have a lifetime cap; grants may apply.',
    jurisdiction: 'CA',
    color: '#06B6D4',
    icon: 'Gift',
    // RESP contributions are primarily constrained by a lifetime cap per beneficiary. We model it as a lifetime cap
    // (and use a matching "annual" cap to keep the existing room model working consistently for MVP).
    annualLimit2026: 50000,
    lifetimeLimit: 50000,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.canada.ca/en/services/benefits/education/education-savings/resp.html',
  },
  // United States
  {
    type: 'IRA',
    name: 'Individual Retirement Account',
    shortName: 'Traditional IRA',
    description: 'Tax-deferred retirement savings with potential deductible contributions.',
    jurisdiction: 'US',
    color: '#3B82F6',
    icon: 'Building',
    annualLimit2026: 7500,
    catchUpAge: 50,
    catchUpAmount: 1000,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  },
  {
    type: 'ROTH_IRA',
    name: 'Roth IRA',
    shortName: 'Roth IRA',
    description: 'Tax-free growth and withdrawals. Income limits apply.',
    jurisdiction: 'US',
    color: '#8B5CF6',
    icon: 'Sparkles',
    annualLimit2026: 7500,
    catchUpAge: 50,
    catchUpAmount: 1000,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  },
  {
    type: '401K',
    name: '401(k) / 403(b) / 457 / TSP',
    shortName: '401(k)',
    description: 'Employer-sponsored retirement plan with elective deferrals.',
    jurisdiction: 'US',
    color: '#F59E0B',
    icon: 'Briefcase',
    annualLimit2026: 24500,
    catchUpAge: 50,
    catchUpAmount: 8000,
    specialCatchUpAge: { min: 60, max: 63 },
    specialCatchUpAmount: 11250,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  },
  {
    type: 'PLAN_529',
    name: '529 College Savings Plan',
    shortName: '529',
    description: 'Education savings plan (US). Contribution limits vary by state and beneficiary.',
    jurisdiction: 'US',
    color: '#22C55E',
    icon: 'Gift',
    // There is no single federal annual contribution cap; plans set overall balance limits.
    // For MVP, treat as "no standard cap" so users can track contributions, and optionally set a personal cap via Set Room.
    annualLimit2026: Number.POSITIVE_INFINITY,
    taxYearType: 'calendar',
    sourceUrl: 'https://www.savingforcollege.com/article/how-much-can-you-contribute-to-a-529-plan',
  },
  // United Kingdom
  {
    type: 'ISA',
    name: 'Individual Savings Account',
    shortName: 'ISA',
    description: 'Tax-free savings and investments. Annual subscription limit.',
    jurisdiction: 'UK',
    color: '#14B8A6',
    icon: 'PiggyBank',
    annualLimit2026: 20000,
    taxYearType: 'uk_tax_year',
    sourceUrl: 'https://www.gov.uk/individual-savings-accounts/how-isas-work',
  },
  {
    type: 'LISA',
    name: 'Lifetime ISA',
    shortName: 'LISA',
    description: 'For first home or retirement. 25% government bonus up to £1,000/year.',
    jurisdiction: 'UK',
    color: '#F97316',
    icon: 'Gift',
    annualLimit2026: 4000,
    taxYearType: 'uk_tax_year',
    sourceUrl: 'https://www.gov.uk/lifetime-isa',
  },
  {
    type: 'PENSION',
    name: 'Pension (Workplace / SIPP)',
    shortName: 'Pension',
    description: 'Tax-relieved pension contributions. Standard annual allowance.',
    jurisdiction: 'UK',
    color: '#EF4444',
    icon: 'Shield',
    annualLimit2026: 60000,
    taxYearType: 'uk_tax_year',
    sourceUrl: 'https://www.gov.uk/tax-on-your-private-pension/annual-allowance',
  },
  {
    type: 'JISA',
    name: 'Junior ISA',
    shortName: 'Junior ISA',
    description: 'Tax-free savings for a child (UK). Annual subscription limit.',
    jurisdiction: 'UK',
    color: '#A855F7',
    icon: 'PiggyBank',
    annualLimit2026: 9000,
    taxYearType: 'uk_tax_year',
    sourceUrl: 'https://www.gov.uk/junior-individual-savings-accounts',
  },
];
