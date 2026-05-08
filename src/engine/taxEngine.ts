import type {
  AppSettings,
  SocialSecurity,
  TaxResult,
  BracketUsage,
  RentalExpenses,
} from "../types";
import {
  TAX_BRACKETS,
  STANDARD_DEDUCTION,
  AGE_65_EXTRA_DEDUCTION,
  LTCG_BRACKETS,
  IRMAA_TIERS,
  RMD_TABLE,
  RMD_START_AGE,
  SS_THRESHOLDS,
} from "../constants/taxConstants";

// ============================================================
// 1. Interpolate Social Security Monthly Benefit
// ============================================================

/**
 * Returns the monthly SS benefit for the selected claimAge by linearly
 * interpolating between the three known data points (62, 67, 70).
 * The earlyRetirementReductionPct is already baked into the benefitAt62
 * figure from the SSA, but we allow an additional explicit reduction
 * if the user specifies one.
 */
export function interpolateSSBenefit(ss: SocialSecurity): number {
  const { claimAge, benefitAt62, benefitAt67, benefitAt70, earlyRetirementReductionPct } = ss;

  let rawMonthlyBenefit: number;

  if (claimAge <= 62) {
    rawMonthlyBenefit = benefitAt62;
  } else if (claimAge < 67) {
    // Linear interpolation between 62 and 67
    const t = (claimAge - 62) / (67 - 62);
    rawMonthlyBenefit = benefitAt62 + t * (benefitAt67 - benefitAt62);
  } else if (claimAge === 67) {
    rawMonthlyBenefit = benefitAt67;
  } else if (claimAge < 70) {
    // Linear interpolation between 67 and 70
    const t = (claimAge - 67) / (70 - 67);
    rawMonthlyBenefit = benefitAt67 + t * (benefitAt70 - benefitAt67);
  } else {
    rawMonthlyBenefit = benefitAt70;
  }

  // Apply optional early retirement reduction percentage
  const reductionFactor = 1 - earlyRetirementReductionPct / 100;
  return rawMonthlyBenefit * reductionFactor;
}

// ============================================================
// 2. Calculate SS Taxable Amount (IRS Two-Tier Formula)
// ============================================================

/**
 * Computes how much of the annual SS benefit is subject to federal tax.
 *
 * IRS two-tier provisional income test:
 *   MFJ:    PI < $32k → 0%, $32k–$44k → up to 50%, >$44k → up to 85%
 *   Single: PI < $25k → 0%, $25k–$34k → up to 50%, >$34k → up to 85%
 *
 * Matches tax.js from the design prototype exactly.
 */
export function calculateSSTaxable(
  provisionalIncome: number,
  annualSSBenefit: number,
  filing: 'MFJ' | 'SINGLE' = 'MFJ'
): number {
  if (annualSSBenefit <= 0) return 0;

  const { base, upper } = SS_THRESHOLDS[filing];

  if (provisionalIncome <= base) return 0;

  // tier1: provisional income in the 50% zone
  const tier1 = Math.min((provisionalIncome - base) * 0.5, annualSSBenefit * 0.5);

  // tier2: provisional income above the 85% threshold
  let tier2 = 0;
  if (provisionalIncome > upper) {
    const part1 = Math.min(annualSSBenefit * 0.5, 0.5 * (upper - base));
    const part2 = 0.85 * (provisionalIncome - upper);
    tier2 = Math.min(0.85 * annualSSBenefit, part1 + part2) - tier1;
  }

  return Math.min(tier1 + tier2, annualSSBenefit * 0.85);
}

// ============================================================
// 3. IRMAA Surcharge
// ============================================================

/**
 * Returns the annual IRMAA surcharge for MFJ based on prior-year MAGI.
 * Uses the IRMAA_TIERS constant (2026 values).
 */
export function getIRMAASurcharge(magi: number, _taxYear: number): number {
  for (const tier of IRMAA_TIERS) {
    if (magi >= tier.magiMin && magi <= tier.magiMax) {
      return tier.annualTotal;
    }
  }
  // Fallback: top tier
  return IRMAA_TIERS[IRMAA_TIERS.length - 1].annualTotal;
}

// ============================================================
// 4. Calculate RMD
// ============================================================

/**
 * Returns the Required Minimum Distribution for a given account balance and age.
 * Returns 0 if age < RMD_START_AGE or the age is not in the table.
 */
export function calculateRMD(balance: number, age: number): number {
  if (age < RMD_START_AGE) return 0;
  const distributionPeriod = RMD_TABLE[age];
  if (distributionPeriod === undefined || distributionPeriod <= 0) return 0;
  return balance / distributionPeriod;
}

// ============================================================
// 5. Calculate Rental Depreciation
// ============================================================

/**
 * Returns the annual straight-line depreciation for a rental property.
 * Only the building value (not land) is depreciable over 27.5 years.
 */
export function calculateDepreciation(rentalExpenses: RentalExpenses): number {
  const buildingValue = rentalExpenses.propertyValue * (1 - rentalExpenses.landValuePct);
  return buildingValue / 27.5;
}

// ============================================================
// 6. Calculate Rental Net Income
// ============================================================

/**
 * Returns gross rental income minus operating expenses and depreciation.
 * Note: depreciation is a paper deduction — it reduces taxable income but
 * not cash flow. The caller must track the cash vs. taxable amounts separately.
 */
export function calculateRentalNetIncome(
  grossRental: number,
  expenses: RentalExpenses,
  depreciation: number
): number {
  return (
    grossRental -
    expenses.propertyTax -
    expenses.insurance -
    expenses.maintenance -
    depreciation
  );
}

// ============================================================
// Helper: Walk Tax Brackets
// ============================================================

function computeTaxFromBrackets(
  taxableIncome: number,
  brackets: Array<{ min: number; max: number; rate: number }>
): { tax: number; bracketUsage: BracketUsage[]; marginalRate: number } {
  let tax = 0;
  let marginalRate = 0;
  const bracketUsage: BracketUsage[] = [];

  for (const bracket of brackets) {
    if (taxableIncome <= 0) break;

    const bracketTop = bracket.max === Infinity ? taxableIncome + bracket.min : bracket.max;
    const amountInBracket = Math.min(taxableIncome, bracketTop - bracket.min + 1);

    if (amountInBracket <= 0) continue;

    const taxPaid = amountInBracket * bracket.rate;
    tax += taxPaid;
    marginalRate = bracket.rate;

    bracketUsage.push({
      rate: bracket.rate,
      amountInBracket,
      taxPaid,
    });

    taxableIncome -= amountInBracket;
  }

  return { tax, bracketUsage, marginalRate };
}

// ============================================================
// 7. Main Federal Tax Calculator
// ============================================================

export interface FederalTaxParams {
  w2Income: number;
  rentalNetIncome: number;
  pensionIncome: number;
  traditionalWithdrawals: number;
  rothConversionAmount: number;
  ssTaxableAmount: number;
  brokerageWithdrawals: number;
  hsaDistributions: number;
  /** Optional: owner ages used to add the age-65 extra standard deduction */
  ageA?: number;
  ageB?: number;
}

/**
 * Calculates federal income tax for a given year.
 *
 * Income stacking order for LTCG:
 *   Ordinary income fills the brackets first, then LTCG (brokerage withdrawals)
 *   are stacked on top. The LTCG rate that applies depends on where they land
 *   relative to the LTCG bracket thresholds.
 */
export function calculateFederalTax(
  params: FederalTaxParams,
  settings: AppSettings,
  taxYear: number
): TaxResult {
  const {
    w2Income,
    rentalNetIncome,
    pensionIncome,
    traditionalWithdrawals,
    rothConversionAmount,
    ssTaxableAmount,
    brokerageWithdrawals,
    hsaDistributions,
    ageA,
    ageB,
  } = params;

  // Resolve tax year — fall back to nearest known year if needed
  const resolvedYear = TAX_BRACKETS[taxYear]
    ? taxYear
    : TAX_BRACKETS[2026]
    ? 2026
    : 2025;

  const brackets = TAX_BRACKETS[resolvedYear]?.[settings.filingStatus] ?? TAX_BRACKETS[2026].MFJ;

  // Base standard deduction + age-65 extra deduction (per qualifying person)
  let stdDed = STANDARD_DEDUCTION[resolvedYear]?.[settings.filingStatus] ?? STANDARD_DEDUCTION[2026].MFJ;
  const age65Extra = AGE_65_EXTRA_DEDUCTION[resolvedYear]?.[settings.filingStatus] ?? 1600;
  if (settings.filingStatus === 'MFJ') {
    const extra65Count = ((ageA ?? 0) >= 65 ? 1 : 0) + ((ageB ?? 0) >= 65 ? 1 : 0);
    stdDed += age65Extra * extra65Count;
  } else {
    if ((ageA ?? 0) >= 65) stdDed += age65Extra;
  }
  const ltcgBrackets = LTCG_BRACKETS[resolvedYear]?.[settings.filingStatus] ?? LTCG_BRACKETS[2026].MFJ;

  // Gross ordinary income (brokerage is LTCG — excluded from ordinary income calculation)
  const grossIncome =
    w2Income +
    rentalNetIncome +
    pensionIncome +
    traditionalWithdrawals +
    rothConversionAmount +
    ssTaxableAmount +
    hsaDistributions;

  // AGI (simplified: no above-the-line deductions modeled here)
  const adjustedGrossIncome = grossIncome;

  // Taxable ordinary income
  const taxableOrdinaryIncome = Math.max(0, adjustedGrossIncome - stdDed);

  // Ordinary income tax
  const { tax: ordinaryIncomeTax, bracketUsage, marginalRate } = computeTaxFromBrackets(
    taxableOrdinaryIncome,
    brackets
  );

  // ---- LTCG Tax ----
  // Stack brokerage withdrawals on top of ordinary income (post-deduction).
  // The LTCG rate is determined by where (ordinaryIncome + LTCG) falls in the LTCG thresholds.
  let ltcgTax = 0;
  if (brokerageWithdrawals > 0) {
    // Ordinary income already "uses up" the lower LTCG brackets
    const ordinaryForLTCG = taxableOrdinaryIncome; // already post-deduction
    let remainingBrokerage = brokerageWithdrawals;
    let stackedIncome = ordinaryForLTCG;

    for (const ltcgBracket of ltcgBrackets) {
      if (remainingBrokerage <= 0) break;

      // How much of the LTCG bracket is still available above ordinary income?
      const bracketTop = ltcgBracket.max === Infinity
        ? stackedIncome + remainingBrokerage + ltcgBracket.min
        : ltcgBracket.max;

      if (stackedIncome >= bracketTop) {
        // Ordinary income already fills this bracket; skip
        continue;
      }

      const availableInBracket = bracketTop - Math.max(stackedIncome, ltcgBracket.min);
      const amountTaxedHere = Math.min(remainingBrokerage, availableInBracket);

      ltcgTax += amountTaxedHere * ltcgBracket.rate;
      stackedIncome += amountTaxedHere;
      remainingBrokerage -= amountTaxedHere;
    }
  }

  // MAGI (for IRMAA): AGI + brokerage withdrawals (simplified; tax-exempt interest excluded)
  const magi = adjustedGrossIncome + brokerageWithdrawals;

  // IRMAA surcharge
  const irmaaSurcharge = getIRMAASurcharge(magi, taxYear);

  const totalFederalTax = ordinaryIncomeTax + ltcgTax;
  const effectiveRate = grossIncome + brokerageWithdrawals > 0
    ? totalFederalTax / (grossIncome + brokerageWithdrawals)
    : 0;

  return {
    grossIncome,
    adjustedGrossIncome,
    standardDeduction: stdDed,
    taxableOrdinaryIncome,
    ordinaryIncomeTax,
    ltcgTax,
    totalFederalTax,
    effectiveRate,
    marginalRate,
    magi,
    bracketUtilization: bracketUsage,
    irmaaSurcharge,
    ssTaxableAmount,
  };
}

// ============================================================
// 8. Bracket Headroom
// ============================================================

/**
 * Returns the number of dollars remaining in the target bracket
 * (e.g. 22%, 24%, 32%) given current taxable ordinary income.
 *
 * Used by Roth conversion "Fill to X%" buttons.
 */
export function getBracketHeadroom(
  taxableIncome: number,
  targetRate: number,
  settings: AppSettings,
  taxYear: number
): number {
  const resolvedYear = TAX_BRACKETS[taxYear] ? taxYear : 2026;
  const brackets = TAX_BRACKETS[resolvedYear]?.[settings.filingStatus] ?? TAX_BRACKETS[2026].MFJ;

  for (const bracket of brackets) {
    if (bracket.rate === targetRate) {
      const bracketWidth = bracket.max === Infinity ? Infinity : bracket.max - bracket.min + 1;
      const consumed = Math.max(0, Math.min(taxableIncome - bracket.min, bracketWidth));
      return bracketWidth === Infinity ? Infinity : Math.max(0, bracketWidth - consumed);
    }
  }

  return 0;
}

/**
 * Returns headroom to the 12%, 22%, and 24% brackets simultaneously.
 * Mirrors the headroom12/headroom22/headroom24 fields from tax.js.
 */
export function getBracketHeadrooms(
  taxableIncome: number,
  settings: AppSettings,
  taxYear: number
): { headroom12: number; headroom22: number; headroom24: number } {
  return {
    headroom12: getBracketHeadroom(taxableIncome, 0.12, settings, taxYear),
    headroom22: getBracketHeadroom(taxableIncome, 0.22, settings, taxYear),
    headroom24: getBracketHeadroom(taxableIncome, 0.24, settings, taxYear),
  };
}
