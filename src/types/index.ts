// ============================================================
// Enums
// ============================================================

export const AccountType = {
  TRADITIONAL_IRA: "TRADITIONAL_IRA",
  ROTH_IRA: "ROTH_IRA",
  TRADITIONAL_401K: "401K_TRADITIONAL",
  ROTH_401K: "401K_ROTH",
  BROKERAGE: "BROKERAGE",
  HSA: "HSA",
  SAVINGS_CASH: "SAVINGS_CASH",
  PENSION: "PENSION",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

// ============================================================
// Core Entity Interfaces
// ============================================================

export interface Person {
  id: "personA" | "personB";
  name: string;
  birthYear: number;
  ssClaimAge: number;
  ssBenefitAt62: number;
  ssBenefitAt67: number;
  ssBenefitAt70: number;
  retirementYear: number;
}

export interface RentalExpenses {
  propertyTax: number;
  insurance: number;
  maintenance: number;
  vacancyRate: number;
  propertyValue: number;
  landValuePct: number;
  propertyAppreciationRate: number;
}

export interface SEPPConfig {
  method: "RMD" | "AMORTIZATION" | "ANNUITIZATION";
  startYear: number;
  endYear: number;
  annualAmount: number;
}

export interface Account {
  id: string;
  owner: "personA" | "personB" | "joint";
  name: string;
  type: AccountType;
  balance: number;
  annualReturnRate: number;
  annualContribution: number;
  contributionEndYear: number;
  isRuleOf55Eligible: boolean;
  isCurrentEmployer: boolean;
  sepp: SEPPConfig | null;
}

export interface IncomeSource {
  id: string;
  owner: "personA" | "personB" | "joint";
  type: "W2" | "RENTAL" | "PENSION" | "OTHER";
  name: string;
  annualGrossAmount: number;
  startYear: number;
  endYear: number;
  inflationAdjusted: boolean;
  rentalExpenses: RentalExpenses | null;
}

export interface SocialSecurity {
  personId: "personA" | "personB";
  claimAge: number;
  benefitAt62: number;
  benefitAt67: number;
  benefitAt70: number;
  earlyRetirementReductionPct: number; // 0-20%
}

export interface Expense {
  id: string;
  name: string;
  annualAmount: number;
  startYear: number;
  endYear: number;
  inflationAdjusted: boolean;
  type: "LIVING" | "MORTGAGE" | "HEALTH_INSURANCE" | "MEDICARE" | "OTHER";
}

export interface WithdrawalOverride {
  accountId: string;
  startYear: number;
  endYear: number;
  annualAmount: number;
}

export interface WithdrawalStrategy {
  mode: "AUTO" | "MANUAL";
  priorityOrder: string[]; // account IDs in order
  overrides: WithdrawalOverride[];
}

export interface RothConversionEntry {
  year: number;
  fromAccountId: string;
  toAccountId: string;
  amount: number | "FILL_22" | "FILL_24" | "FILL_32";
}

export interface RothConversionPlan {
  entries: RothConversionEntry[];
}

export interface AppSettings {
  inflationRate: number;
  planningHorizonAge: number;
  filingStatus: "MFJ" | "SINGLE";
  state: string;
  currentYear: number;
  taxYear: number;
  returnRateOverride: number | null; // null = use per-account rates
  lifeExpectancyOverride: number | null;
  livingExpensesAdjPct: number; // +/- percentage adjustment
  rothConversionAdjPct: number; // +/- percentage
}

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string; // ISO date string
  state: Omit<AppState, "scenarios">; // snapshot
}

export interface AppState {
  persons: Person[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  socialSecurity: SocialSecurity[];
  expenses: Expense[];
  withdrawalStrategy: WithdrawalStrategy;
  rothConversionPlan: RothConversionPlan;
  settings: AppSettings;
  scenarios: SavedScenario[];
  activeScenarioId: string | null;
  hasCompletedWizard: boolean;
}

// ============================================================
// Simulation Output Types
// ============================================================

export interface BracketUsage {
  rate: number;
  amountInBracket: number;
  taxPaid: number;
}

export interface TaxResult {
  grossIncome: number;
  adjustedGrossIncome: number;
  standardDeduction: number;
  taxableOrdinaryIncome: number;
  ordinaryIncomeTax: number;
  ltcgTax: number;
  totalFederalTax: number;
  effectiveRate: number;
  marginalRate: number;
  magi: number;
  bracketUtilization: BracketUsage[];
  irmaaSurcharge: number;
  ssTaxableAmount: number;
}

export interface IncomeBreakdown {
  w2: number;
  rentalNet: number;
  pension: number;
  ssA: number;
  ssB: number;
  rothConversion: number;
  traditionalWithdrawals: number;
  brokerageWithdrawals: number;
  hsaDistributions: number;
}

export interface YearResult {
  year: number;
  ageA: number;
  ageB: number;
  accountBalances: Record<string, number>;
  accountEndBalances: Record<string, number>;
  contributions: Record<string, number>;
  withdrawals: Record<string, number>;
  rothConversions: Record<string, number>;
  rmds: Record<string, number>;
  income: IncomeBreakdown;
  taxResult: TaxResult;
  expenses: Record<string, number>;
  totalExpenses: number;
  netIncome: number;
  surplus: number;
  totalRetirementAssets: number;
  totalAssets: number;
  estateValue: number;
  hasShortfall: boolean;
  depletedAccounts: string[];
  irmaaTriggered: boolean;
}
