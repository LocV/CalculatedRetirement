import { AccountType } from "../types";
import type {
  AppState,
  YearResult,
  IncomeBreakdown,
  TaxResult,
} from "../types";
import { RMD_START_AGE, STANDARD_DEDUCTION } from "../constants/taxConstants";
import {
  interpolateSSBenefit,
  calculateSSTaxable,
  calculateRMD,
  calculateDepreciation,
  calculateRentalNetIncome,
  calculateFederalTax,
  getBracketHeadroom,
} from "./taxEngine";
import type { FederalTaxParams } from "./taxEngine";

// ============================================================
// Helper Utilities
// ============================================================

function getAge(birthYear: number, currentYear: number): number {
  return currentYear - birthYear;
}

function isTraditional(type: AccountType): boolean {
  return (
    type === AccountType.TRADITIONAL_IRA ||
    type === AccountType.TRADITIONAL_401K
  );
}

function isRoth(type: AccountType): boolean {
  return type === AccountType.ROTH_IRA || type === AccountType.ROTH_401K;
}

function isBrokerage(type: AccountType): boolean {
  return type === AccountType.BROKERAGE;
}

function isHSA(type: AccountType): boolean {
  return type === AccountType.HSA;
}

/**
 * Applies inflation compounding to a base amount.
 * year 0 = currentYear (no adjustment).
 */
function inflationAdjust(amount: number, inflationRate: number, yearsFromBase: number): number {
  return amount * Math.pow(1 + inflationRate, yearsFromBase);
}

// ============================================================
// Main Simulation Entry Point
// ============================================================

export function simulate(state: AppState): YearResult[] {
  const {
    persons,
    accounts,
    incomeSources,
    socialSecurity,
    expenses,
    withdrawalStrategy,
    rothConversionPlan,
    settings,
  } = state;

  // Determine simulation range
  const earliestBirthYear = Math.min(...persons.map((p) => p.birthYear));
  const endYear = earliestBirthYear + settings.planningHorizonAge;
  const startYear = settings.currentYear;

  // Build mutable balance map (keyed by account ID)
  const balances: Record<string, number> = {};
  for (const acct of accounts) {
    balances[acct.id] = acct.balance;
  }

  const results: YearResult[] = [];

  // ---- Year Loop ----
  for (let year = startYear; year <= endYear; year++) {
    const yearOffset = year - startYear; // for inflation indexing

    // Cache person ages this year
    const personA = persons.find((p) => p.id === "personA");
    const personB = persons.find((p) => p.id === "personB");
    const ageA = personA ? getAge(personA.birthYear, year) : 0;
    const ageB = personB ? getAge(personB.birthYear, year) : 0;

    // ----------------------------------------------------------------
    // STEP 1: Record starting balances
    // ----------------------------------------------------------------
    const accountBalances: Record<string, number> = {};
    for (const acct of accounts) {
      accountBalances[acct.id] = Math.max(0, balances[acct.id] ?? 0);
    }

    // ----------------------------------------------------------------
    // STEP 2: Apply contributions
    // ----------------------------------------------------------------
    const contributions: Record<string, number> = {};
    for (const acct of accounts) {
      contributions[acct.id] = 0;

      // Stop contributions after contributionEndYear or owner's retirement year
      let ownerRetirementYear = 9999;
      if (acct.owner !== "joint") {
        const ownerPerson = persons.find((p) => p.id === acct.owner);
        if (ownerPerson) ownerRetirementYear = ownerPerson.retirementYear;
      }

      if (
        year <= acct.contributionEndYear &&
        year < ownerRetirementYear &&
        acct.annualContribution > 0
      ) {
        const contrib = acct.annualContribution;
        balances[acct.id] = (balances[acct.id] ?? 0) + contrib;
        contributions[acct.id] = contrib;
      }
    }

    // ----------------------------------------------------------------
    // STEP 3: Collect income
    // ----------------------------------------------------------------
    let w2Total = 0;
    let rentalGross = 0;
    let rentalNetForTax = 0;
    let rentalCashFlow = 0;
    let pensionTotal = 0;

    // Track SS income by person
    let ssAMonthly = 0;
    let ssBMonthly = 0;

    // W-2, Rental, Pension
    for (const src of incomeSources) {
      if (year < src.startYear || year > src.endYear) continue;

      let amount = src.annualGrossAmount;
      if (src.inflationAdjusted) {
        amount = inflationAdjust(amount, settings.inflationRate, yearOffset);
      }

      if (src.type === "W2") {
        // Partial year if this is the retirement year of that person
        const ownerPerson = persons.find((p) => p.id === src.owner);
        if (ownerPerson && year === ownerPerson.retirementYear) {
          amount = amount * 0.5;
        }
        w2Total += amount;
      } else if (src.type === "RENTAL") {
        const expenses_ = src.rentalExpenses;
        if (expenses_) {
          const depreciation = calculateDepreciation(expenses_);
          const netForTax = calculateRentalNetIncome(amount, expenses_, depreciation);
          const cashFlow =
            amount - expenses_.propertyTax - expenses_.insurance - expenses_.maintenance;
          rentalGross += amount;
          rentalNetForTax += netForTax;
          rentalCashFlow += cashFlow;
        } else {
          rentalGross += amount;
          rentalNetForTax += amount;
          rentalCashFlow += amount;
        }
      } else if (src.type === "PENSION") {
        pensionTotal += amount;
      }
    }

    // Social Security
    for (const ss of socialSecurity) {
      const ownerPerson = persons.find((p) => p.id === ss.personId);
      if (!ownerPerson) continue;
      const ownerAge = getAge(ownerPerson.birthYear, year);

      if (ownerAge >= ss.claimAge) {
        const monthlyBenefit = interpolateSSBenefit(ss);
        if (ss.personId === "personA") {
          ssAMonthly = monthlyBenefit;
        } else {
          ssBMonthly = monthlyBenefit;
        }
      }
    }

    const ssAnnualA = ssAMonthly * 12;
    const ssAnnualB = ssBMonthly * 12;
    const totalSSBenefit = ssAnnualA + ssAnnualB;

    // ----------------------------------------------------------------
    // STEP 4: Calculate RMDs
    // ----------------------------------------------------------------
    const rmds: Record<string, number> = {};
    for (const acct of accounts) {
      rmds[acct.id] = 0;
      if (!isTraditional(acct.type)) continue;

      const ownerAge = acct.owner === "personA" ? ageA : acct.owner === "personB" ? ageB : 0;
      if (ownerAge < RMD_START_AGE) continue;

      const rmd = calculateRMD(accountBalances[acct.id] ?? 0, ownerAge);
      rmds[acct.id] = rmd;
    }

    // ----------------------------------------------------------------
    // STEP 5: Roth Conversions
    // ----------------------------------------------------------------
    const rothConversions: Record<string, number> = {};
    for (const acct of accounts) {
      rothConversions[acct.id] = 0;
    }

    // Gather all conversion entries for this year
    const convEntries = rothConversionPlan.entries.filter((e) => e.year === year);

    // We need a preliminary tax estimate to compute "FILL_XX" headroom.
    // Use current-year ordinary income (before conversions) to estimate bracket position.
    let totalRothConversionAmount = 0;

    for (const entry of convEntries) {
      const fromAcct = accounts.find((a) => a.id === entry.fromAccountId);
      if (!fromAcct) continue;
      if ((balances[entry.fromAccountId] ?? 0) <= 0) continue;

      let conversionAmount = 0;

      if (typeof entry.amount === "number") {
        conversionAmount = Math.min(entry.amount, balances[entry.fromAccountId] ?? 0);
      } else {
        // FILL_XX — compute headroom
        const targetRate =
          entry.amount === "FILL_22" ? 0.22 :
          entry.amount === "FILL_24" ? 0.24 :
          entry.amount === "FILL_32" ? 0.32 : 0.24;

        // Estimate current ordinary taxable income (without conversions)
        // Provisional SS taxable using estimated PI
        const provisionalPI = w2Total + rentalNetForTax + pensionTotal + (totalSSBenefit * 0.5);
        const estSSTaxable = calculateSSTaxable(provisionalPI, totalSSBenefit);

        const estOrdinaryIncome =
          w2Total + rentalNetForTax + pensionTotal + estSSTaxable;
        const stdDed = settings.taxYear
          ? (STANDARD_DEDUCTION[settings.taxYear]?.[settings.filingStatus] ?? 30000)
          : 30000;

        const estTaxableBeforeConversion = Math.max(0, estOrdinaryIncome - stdDed);

        const headroom = getBracketHeadroom(
          estTaxableBeforeConversion,
          targetRate,
          settings,
          settings.taxYear
        );

        // Apply rothConversionAdjPct
        const adjFactor = 1 + settings.rothConversionAdjPct / 100;
        conversionAmount = Math.min(
          headroom * adjFactor,
          balances[entry.fromAccountId] ?? 0
        );
      }

      conversionAmount = Math.max(0, conversionAmount);
      if (conversionAmount <= 0) continue;

      // Move balance from → to
      balances[entry.fromAccountId] = (balances[entry.fromAccountId] ?? 0) - conversionAmount;
      balances[entry.toAccountId] = (balances[entry.toAccountId] ?? 0) + conversionAmount;

      rothConversions[entry.fromAccountId] =
        (rothConversions[entry.fromAccountId] ?? 0) + conversionAmount;
      totalRothConversionAmount += conversionAmount;
    }

    // ----------------------------------------------------------------
    // STEP 6 + 7: Compute expenses, then withdrawals + taxes iteratively
    // ----------------------------------------------------------------

    // Compute expenses for this year
    const expenseRecord: Record<string, number> = {};
    let totalExpenses = 0;

    for (const exp of expenses) {
      if (year < exp.startYear || year > exp.endYear) {
        expenseRecord[exp.id] = 0;
        continue;
      }

      let amount = exp.annualAmount;

      // Inflation adjustment
      if (exp.inflationAdjusted) {
        amount = inflationAdjust(amount, settings.inflationRate, yearOffset);
      }

      // Living expenses adjustment setting
      if (exp.type === "LIVING") {
        amount = amount * (1 + settings.livingExpensesAdjPct / 100);
      }

      // Partial mortgage year (2032 — last year, 9 months remaining assumed)
      if (exp.type === "MORTGAGE" && year === exp.endYear) {
        amount = amount * (9 / 12);
      }

      expenseRecord[exp.id] = amount;
      totalExpenses += amount;
    }

    // We need taxes to determine total cash needed.
    // Iterative approach: estimate taxes, compute withdrawals, recompute taxes.
    // We do two passes for simplicity (usually converges in 2).

    const withdrawals: Record<string, number> = {};
    for (const acct of accounts) {
      withdrawals[acct.id] = 0;
    }

    let taxResult: TaxResult | null = null;
    let totalTraditionalWithdrawals = 0;
    let totalBrokerageWithdrawals = 0;
    let totalHSADistributions = 0;
    let depletedAccounts: string[] = [];

    // ---- Compute SS taxable (needs final income, approximated first) ----
    // We do a two-pass:

    for (let pass = 0; pass < 2; pass++) {
      // Reset withdrawals each pass
      for (const acct of accounts) {
        withdrawals[acct.id] = 0;
      }
      totalTraditionalWithdrawals = 0;
      totalBrokerageWithdrawals = 0;
      totalHSADistributions = 0;
      depletedAccounts = [];

      // Estimate taxes from pass 0 (or use previous pass result)
      const estimatedTax = taxResult ? taxResult.totalFederalTax + taxResult.irmaaSurcharge : 0;

      // Total cash needed = expenses + taxes
      let cashNeeded = totalExpenses + estimatedTax;

      // Available cash income (non-withdrawal)
      const cashIncome = w2Total + rentalCashFlow + pensionTotal + ssAnnualA + ssAnnualB;
      let shortfall = Math.max(0, cashNeeded - cashIncome);

      // RMDs must be taken first (already computed in step 4)
      // Apply RMDs as mandatory withdrawals
      for (const acct of accounts) {
        const rmd = rmds[acct.id] ?? 0;
        if (rmd <= 0) continue;
        const available = Math.max(0, balances[acct.id] ?? 0);
        const taken = Math.min(rmd, available);
        withdrawals[acct.id] = taken;
        totalTraditionalWithdrawals += taken;
        shortfall = Math.max(0, shortfall - taken);
      }

      // Withdrawal to cover remaining shortfall (in priority order or overrides)
      if (withdrawalStrategy.mode === "MANUAL") {
        // Apply manual overrides
        for (const override of withdrawalStrategy.overrides) {
          if (year < override.startYear || year > override.endYear) continue;
          const acct = accounts.find((a) => a.id === override.accountId);
          if (!acct) continue;
          const available = Math.max(0, (balances[acct.id] ?? 0) - (withdrawals[acct.id] ?? 0));
          const taken = Math.min(override.annualAmount, available);
          withdrawals[acct.id] = (withdrawals[acct.id] ?? 0) + taken;

          if (isTraditional(acct.type)) totalTraditionalWithdrawals += taken;
          else if (isBrokerage(acct.type)) totalBrokerageWithdrawals += taken;
          else if (isHSA(acct.type)) totalHSADistributions += taken;
        }
      } else {
        // AUTO mode: draw in priority order
        for (const accountId of withdrawalStrategy.priorityOrder) {
          if (shortfall <= 0) break;
          const acct = accounts.find((a) => a.id === accountId);
          if (!acct) continue;

          // Check Rule of 55 eligibility
          if (acct.isCurrentEmployer && acct.isRuleOf55Eligible) {
            const ownerPerson = persons.find((p) => p.id === acct.owner);
            if (ownerPerson) {
              const retirementAge = ownerPerson.retirementYear - ownerPerson.birthYear;
              if (retirementAge < 55) continue; // Not eligible yet
            }
          }

          // Already have RMD amount taken; only draw additional needed
          const alreadyTaken = withdrawals[acct.id] ?? 0;
          const available = Math.max(0, (balances[acct.id] ?? 0) - alreadyTaken);
          if (available <= 0) continue;

          const taken = Math.min(shortfall, available);
          withdrawals[acct.id] = alreadyTaken + taken;
          shortfall -= taken;

          if (isTraditional(acct.type)) totalTraditionalWithdrawals += taken;
          else if (isBrokerage(acct.type)) totalBrokerageWithdrawals += taken;
          else if (isHSA(acct.type)) totalHSADistributions += taken;
        }
      }

      // ---- SEPP withdrawals (override if applicable) ----
      for (const acct of accounts) {
        if (!acct.sepp) continue;
        const { startYear: sStart, endYear: sEnd, annualAmount } = acct.sepp;
        if (year < sStart || year > sEnd) continue;

        const current = withdrawals[acct.id] ?? 0;
        if (annualAmount > current) {
          const extra = annualAmount - current;
          const available = Math.max(0, (balances[acct.id] ?? 0) - current);
          const taken = Math.min(extra, available);
          withdrawals[acct.id] = current + taken;
          if (isTraditional(acct.type)) totalTraditionalWithdrawals += taken;
        }
      }

      // ---- Compute SS taxable ----
      // Provisional income = AGI + half of SS
      const ordinaryIncomeEst =
        w2Total +
        rentalNetForTax +
        pensionTotal +
        totalTraditionalWithdrawals +
        totalRothConversionAmount;
      const provisionalIncome = ordinaryIncomeEst + totalSSBenefit * 0.5;
      const ssTaxableAmount = calculateSSTaxable(provisionalIncome, totalSSBenefit);

      // ---- Calculate federal tax ----
      const taxParams: FederalTaxParams = {
        w2Income: w2Total,
        rentalNetIncome: rentalNetForTax,
        pensionIncome: pensionTotal,
        traditionalWithdrawals: totalTraditionalWithdrawals,
        rothConversionAmount: totalRothConversionAmount,
        ssTaxableAmount,
        brokerageWithdrawals: totalBrokerageWithdrawals,
        hsaDistributions: totalHSADistributions,
      };

      taxResult = calculateFederalTax(taxParams, settings, settings.taxYear);
    }

    // Final tax result should be defined after both passes
    if (!taxResult) {
      taxResult = calculateFederalTax(
        {
          w2Income: 0,
          rentalNetIncome: 0,
          pensionIncome: 0,
          traditionalWithdrawals: 0,
          rothConversionAmount: 0,
          ssTaxableAmount: 0,
          brokerageWithdrawals: 0,
          hsaDistributions: 0,
        },
        settings,
        settings.taxYear
      );
    }

    // ----------------------------------------------------------------
    // Apply withdrawals to balances and track depletion
    // ----------------------------------------------------------------
    for (const acct of accounts) {
      const taken = withdrawals[acct.id] ?? 0;
      balances[acct.id] = Math.max(0, (balances[acct.id] ?? 0) - taken);
      if (balances[acct.id] === 0 && taken > 0) {
        depletedAccounts.push(acct.id);
      }
    }

    // ----------------------------------------------------------------
    // STEP 8: Apply investment growth (mid-year approximation)
    // ----------------------------------------------------------------
    for (const acct of accounts) {
      const startBal = accountBalances[acct.id] ?? 0;
      const endBal = balances[acct.id] ?? 0;
      const rate =
        settings.returnRateOverride !== null
          ? settings.returnRateOverride
          : acct.annualReturnRate;

      const growth = ((startBal + endBal) / 2) * rate;
      balances[acct.id] = Math.max(0, endBal + growth);
    }

    // ----------------------------------------------------------------
    // STEP 9: Record YearResult
    // ----------------------------------------------------------------
    const accountEndBalances: Record<string, number> = {};
    for (const acct of accounts) {
      accountEndBalances[acct.id] = Math.max(0, balances[acct.id] ?? 0);
    }

    const totalRetirementAssets = accounts
      .filter((a) => isTraditional(a.type) || isRoth(a.type) || isHSA(a.type))
      .reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);

    const totalAssets = accounts.reduce(
      (sum, a) => sum + (balances[a.id] ?? 0),
      0
    );

    // Estate value: all assets (simplified; no property appreciation tracked in balances)
    const estateValue = totalAssets;

    // Net income = all cash in - all taxes - expenses
    const totalCashIn =
      w2Total +
      rentalCashFlow +
      pensionTotal +
      ssAnnualA +
      ssAnnualB +
      Object.values(withdrawals).reduce((s, v) => s + v, 0);

    const netIncome =
      totalCashIn - (taxResult.totalFederalTax + taxResult.irmaaSurcharge) - totalExpenses;

    // Surplus: if positive, reinvest in brokerage
    const surplus = netIncome;
    if (surplus > 0 && balances["acc-brokerage"] !== undefined) {
      balances["acc-brokerage"] = (balances["acc-brokerage"] ?? 0) + surplus;
      accountEndBalances["acc-brokerage"] =
        (accountEndBalances["acc-brokerage"] ?? 0) + surplus;
    }

    const hasShortfall = netIncome < 0;

    const income: IncomeBreakdown = {
      w2: w2Total,
      rentalNet: rentalNetForTax,
      pension: pensionTotal,
      ssA: ssAnnualA,
      ssB: ssAnnualB,
      rothConversion: totalRothConversionAmount,
      traditionalWithdrawals: totalTraditionalWithdrawals,
      brokerageWithdrawals: totalBrokerageWithdrawals,
      hsaDistributions: totalHSADistributions,
    };

    const irmaaTriggered = taxResult.irmaaSurcharge > 0;

    results.push({
      year,
      ageA,
      ageB,
      accountBalances,
      accountEndBalances,
      contributions,
      withdrawals,
      rothConversions,
      rmds,
      income,
      taxResult,
      expenses: expenseRecord,
      totalExpenses,
      netIncome,
      surplus,
      totalRetirementAssets,
      totalAssets,
      estateValue,
      hasShortfall,
      depletedAccounts,
      irmaaTriggered,
    });
  }

  return results;
}
