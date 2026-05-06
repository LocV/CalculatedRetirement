import type { AppState } from "../types";
import { AccountType } from "../types";

// ============================================================
// Default Priority Order
// ============================================================

export const DEFAULT_PRIORITY_ORDER: string[] = [
  "acc-bob-401k",
  "acc-spouse-401k",
  "acc-brokerage",
  "acc-cash",
  "acc-bob-ira",
  "acc-spouse-ira",
  "acc-bob-roth",
  "acc-spouse-roth",
];

// ============================================================
// Default App State
// ============================================================

export const DEFAULT_APP_STATE: AppState = {
  // ----------------------------------------------------------
  // Persons
  // ----------------------------------------------------------
  persons: [
    {
      id: "personA",
      name: "Bob",
      birthYear: 1975,
      retirementYear: 2030,
      ssClaimAge: 70,
      ssBenefitAt62: 2917,
      ssBenefitAt67: 4232,
      ssBenefitAt70: 5265,
    },
    {
      id: "personB",
      name: "Spouse",
      birthYear: 1975,
      retirementYear: 2030,
      ssClaimAge: 67,
      ssBenefitAt62: 0,
      ssBenefitAt67: 0,
      ssBenefitAt70: 0,
    },
  ],

  // ----------------------------------------------------------
  // Accounts
  // ----------------------------------------------------------
  accounts: [
    {
      id: "acc-bob-ira",
      owner: "personA",
      name: "Bob's Rollover IRA",
      type: AccountType.TRADITIONAL_IRA,
      balance: 4000000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: false,
      isCurrentEmployer: false,
      sepp: null,
    },
    {
      id: "acc-bob-401k",
      owner: "personA",
      name: "Bob's 401(k)",
      type: AccountType.TRADITIONAL_401K,
      balance: 300000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: true,
      isCurrentEmployer: true,
      sepp: null,
    },
    {
      id: "acc-bob-roth",
      owner: "personA",
      name: "Bob's Roth IRA",
      type: AccountType.ROTH_IRA,
      balance: 25000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: false,
      isCurrentEmployer: false,
      sepp: null,
    },
    {
      id: "acc-spouse-401k",
      owner: "personB",
      name: "Spouse's 401(k)",
      type: AccountType.TRADITIONAL_401K,
      balance: 400000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: true,
      isCurrentEmployer: true,
      sepp: null,
    },
    {
      id: "acc-spouse-ira",
      owner: "personB",
      name: "Spouse's IRA",
      type: AccountType.TRADITIONAL_IRA,
      balance: 600000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: false,
      isCurrentEmployer: false,
      sepp: null,
    },
    {
      id: "acc-spouse-roth",
      owner: "personB",
      name: "Spouse's Roth IRA",
      type: AccountType.ROTH_IRA,
      balance: 15000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: false,
      isCurrentEmployer: false,
      sepp: null,
    },
    {
      id: "acc-brokerage",
      owner: "joint",
      name: "Joint Brokerage",
      type: AccountType.BROKERAGE,
      balance: 250000,
      annualReturnRate: 0.06,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: false,
      isCurrentEmployer: false,
      sepp: null,
    },
    {
      id: "acc-cash",
      owner: "joint",
      name: "Cash / Emergency Fund",
      type: AccountType.SAVINGS_CASH,
      balance: 50000,
      annualReturnRate: 0.005,
      annualContribution: 0,
      contributionEndYear: 2029,
      isRuleOf55Eligible: false,
      isCurrentEmployer: false,
      sepp: null,
    },
  ],

  // ----------------------------------------------------------
  // Income Sources
  // ----------------------------------------------------------
  incomeSources: [
    {
      id: "inc-bob-w2",
      owner: "personA",
      type: "W2",
      name: "Bob's W-2",
      annualGrossAmount: 360400,
      startYear: 2026,
      endYear: 2029,
      inflationAdjusted: false,
      rentalExpenses: null,
    },
    {
      id: "inc-spouse-w2",
      owner: "personB",
      type: "W2",
      name: "Spouse's W-2",
      annualGrossAmount: 39600,
      startYear: 2026,
      endYear: 2029,
      inflationAdjusted: false,
      rentalExpenses: null,
    },
    {
      id: "inc-rental",
      owner: "joint",
      type: "RENTAL",
      name: "Rental Property",
      annualGrossAmount: 39600,
      startYear: 2026,
      endYear: 9999,
      inflationAdjusted: false,
      rentalExpenses: {
        propertyTax: 12000,
        insurance: 2000,
        maintenance: 3000,
        vacancyRate: 0,
        propertyValue: 1000000,
        landValuePct: 0.20,
        propertyAppreciationRate: 0.03,
      },
    },
    {
      id: "inc-spouse-pension",
      owner: "personB",
      type: "PENSION",
      name: "Spouse's Pension",
      annualGrossAmount: 6000,
      startYear: 2030,
      endYear: 9999,
      inflationAdjusted: false,
      rentalExpenses: null,
    },
  ],

  // ----------------------------------------------------------
  // Social Security
  // ----------------------------------------------------------
  socialSecurity: [
    {
      personId: "personA",
      claimAge: 70,
      benefitAt62: 2917,
      benefitAt67: 4232,
      benefitAt70: 5265,
      earlyRetirementReductionPct: 8,
    },
    {
      personId: "personB",
      claimAge: 67,
      benefitAt62: 0,
      benefitAt67: 0,
      benefitAt70: 0,
      earlyRetirementReductionPct: 0,
    },
  ],

  // ----------------------------------------------------------
  // Expenses
  // ----------------------------------------------------------
  expenses: [
    {
      id: "exp-living",
      name: "Living Expenses",
      annualAmount: 110000,
      startYear: 2026,
      endYear: 9999,
      inflationAdjusted: true,
      type: "LIVING",
    },
    {
      id: "exp-mortgage",
      name: "Mortgage Payment",
      annualAmount: 54900,
      startYear: 2026,
      endYear: 2032,
      inflationAdjusted: false,
      type: "MORTGAGE",
    },
    {
      id: "exp-health-insurance",
      name: "Health Insurance (pre-Medicare)",
      annualAmount: 26400,
      startYear: 2030,
      endYear: 2039,
      inflationAdjusted: true,
      type: "HEALTH_INSURANCE",
    },
    {
      id: "exp-medicare",
      name: "Medicare + Supplement",
      annualAmount: 7200,
      startYear: 2040,
      endYear: 9999,
      inflationAdjusted: true,
      type: "MEDICARE",
    },
  ],

  // ----------------------------------------------------------
  // Withdrawal Strategy
  // ----------------------------------------------------------
  withdrawalStrategy: {
    mode: "AUTO",
    priorityOrder: DEFAULT_PRIORITY_ORDER,
    overrides: [],
  },

  // ----------------------------------------------------------
  // Roth Conversion Plan (2030-2042, FILL_24 each year)
  // ----------------------------------------------------------
  rothConversionPlan: {
    entries: [
      { year: 2030, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2031, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2032, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2033, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2034, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2035, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2036, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2037, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2038, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2039, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2040, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2041, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
      { year: 2042, fromAccountId: "acc-bob-ira", toAccountId: "acc-bob-roth", amount: "FILL_24" },
    ],
  },

  // ----------------------------------------------------------
  // Settings
  // ----------------------------------------------------------
  settings: {
    inflationRate: 0.03,
    planningHorizonAge: 90,
    filingStatus: "MFJ",
    state: "WA",
    currentYear: 2026,
    taxYear: 2026,
    returnRateOverride: null,
    lifeExpectancyOverride: null,
    livingExpensesAdjPct: 0,
    rothConversionAdjPct: 0,
  },

  // ----------------------------------------------------------
  // Scenarios / Meta
  // ----------------------------------------------------------
  scenarios: [],
  activeScenarioId: null,
  hasCompletedWizard: false,
};
