import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Info } from "lucide-react";
import { useApp } from "../context/AppContext";
import { AccountType } from "../types";
import { formatCurrency, cn } from "../utils/formatters";
import { WA_ESTATE_TAX_THRESHOLD } from "../constants/taxConstants";

// ─── WA Estate Tax Calculation ────────────────────────────────────────────────

function calcWAEstateTax(estate: number, bypassTrust: boolean): number {
  const threshold = bypassTrust ? WA_ESTATE_TAX_THRESHOLD * 2 : WA_ESTATE_TAX_THRESHOLD;
  if (estate <= threshold) return 0;

  const taxable = estate - threshold;
  // Simplified progressive: 10% on first $1M over threshold, 15% on next $1M, 20% beyond
  let tax = 0;
  if (taxable <= 1_000_000) {
    tax = taxable * 0.10;
  } else if (taxable <= 2_000_000) {
    tax = 1_000_000 * 0.10 + (taxable - 1_000_000) * 0.15;
  } else {
    tax = 1_000_000 * 0.10 + 1_000_000 * 0.15 + (taxable - 2_000_000) * 0.20;
  }
  return tax;
}

// ─── Estate Projection Panel ──────────────────────────────────────────────────

function EstateProjection() {
  const { state, simulation } = useApp();
  const { accounts } = state;

  const bobBirthYear = state.persons.find((p) => p.id === "personA")?.birthYear ?? 1975;
  const milestoneAges = [75, 80, 85, 90];
  const milestoneYears = milestoneAges.map((age) => bobBirthYear + age);

  const tradAccounts = accounts.filter(
    (a) =>
      a.type === AccountType.TRADITIONAL_IRA ||
      a.type === AccountType.TRADITIONAL_401K
  );
  const rothAccounts = accounts.filter(
    (a) => a.type === AccountType.ROTH_IRA || a.type === AccountType.ROTH_401K
  );
  const brokerageAccounts = accounts.filter((a) => a.type === AccountType.BROKERAGE);
  const cashAccounts = accounts.filter((a) => a.type === AccountType.SAVINGS_CASH);

  // Real estate from rental income sources
  const rentalSources = state.incomeSources.filter((s) => s.type === "RENTAL");
  const initialRealEstate = rentalSources.reduce(
    (sum, s) => sum + (s.rentalExpenses?.propertyValue ?? 0),
    0
  );

  function getSimYear(year: number) {
    return simulation.find((yr) => yr.year === year);
  }

  function getBalance(year: number, accs: typeof accounts) {
    const sim = getSimYear(year);
    if (!sim) return 0;
    return accs.reduce((sum, a) => sum + (sim.accountEndBalances[a.id] ?? 0), 0);
  }

  function getRealEstate(year: number) {
    const yearsGrown = year - state.settings.currentYear;
    const avgAppreciation = 0.04;
    return initialRealEstate * Math.pow(1 + avgAppreciation, Math.max(0, yearsGrown));
  }

  const chartData = milestoneAges.map((age, i) => {
    const year = milestoneYears[i];
    const trad = getBalance(year, tradAccounts);
    const roth = getBalance(year, rothAccounts);
    const brokerage = getBalance(year, brokerageAccounts);
    const cash = getBalance(year, cashAccounts);
    const realEstate = getRealEstate(year);
    return { age: `Age ${age}`, trad, roth, brokerage, cash, realEstate, year };
  });

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-[#1B3A6B]">Estate Projection by Milestone Age</h3>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="age" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
            <Legend />
            <Bar dataKey="trad" stackId="a" fill="#94a3b8" name="Traditional" />
            <Bar dataKey="roth" stackId="a" fill="#4A6FA5" name="Roth" />
            <Bar dataKey="brokerage" stackId="a" fill="#6ee7b7" name="Brokerage" />
            <Bar dataKey="realEstate" stackId="a" fill="#fcd34d" name="Real Estate" />
            <Bar dataKey="cash" stackId="a" fill="#c4b5fd" name="Cash" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone table */}
      <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Account</th>
              {milestoneAges.map((age) => (
                <th key={age} className="px-3 py-2 text-right font-semibold text-slate-700">Age {age}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-t border-slate-100 bg-white hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">{acc.name}</td>
                {milestoneYears.map((year) => {
                  const sim = getSimYear(year);
                  const bal = sim?.accountEndBalances[acc.id] ?? 0;
                  return (
                    <td key={year} className="px-3 py-2 text-right text-slate-600">
                      {formatCurrency(bal)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="px-3 py-2 text-slate-700">Total Estate</td>
              {chartData.map((d) => (
                <td key={d.age} className="px-3 py-2 text-right text-[#1B3A6B]">
                  {formatCurrency(d.trad + d.roth + d.brokerage + d.cash + d.realEstate)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tax Impact Panel ─────────────────────────────────────────────────────────

function TaxImpact() {
  const { state, simulation } = useApp();
  const { accounts } = state;

  const bobBirthYear = state.persons.find((p) => p.id === "personA")?.birthYear ?? 1975;
  const age90Year = bobBirthYear + 90;
  const simAt90 = simulation.find((yr) => yr.year === age90Year);

  const tradIRAs = accounts.filter(
    (a) =>
      a.type === AccountType.TRADITIONAL_IRA || a.type === AccountType.TRADITIONAL_401K
  );
  const rothIRAs = accounts.filter(
    (a) => a.type === AccountType.ROTH_IRA || a.type === AccountType.ROTH_401K
  );

  const tradBalance = tradIRAs.reduce(
    (sum, a) => sum + (simAt90?.accountEndBalances[a.id] ?? 0),
    0
  );
  const rothBalance = rothIRAs.reduce(
    (sum, a) => sum + (simAt90?.accountEndBalances[a.id] ?? 0),
    0
  );
  const brokerageBalance = accounts
    .filter((a) => a.type === AccountType.BROKERAGE)
    .reduce((sum, a) => sum + (simAt90?.accountEndBalances[a.id] ?? 0), 0);

  // 10-year rule: each of 3 children receives tradBalance/3, taxed at 22% each year for 10 years
  const numChildren = 3;
  const perChildTrad = tradBalance / numChildren;
  const perChildAnnual = perChildTrad / 10;
  const annualTaxPerChild = perChildAnnual * 0.22;
  const totalInheritanceTax = annualTaxPerChild * 10 * numChildren;

  const totalEstate = tradBalance + rothBalance + brokerageBalance;
  const waNoBypass = calcWAEstateTax(totalEstate, false);
  const waWithBypass = calcWAEstateTax(totalEstate, true);
  const waSavings = waNoBypass - waWithBypass;

  // Without conversions: grow bob's IRA at 6% with no conversions
  const bobIRA = accounts.find(
    (a) => a.type === AccountType.TRADITIONAL_IRA && a.owner === "personA"
  );
  const yearsTo90 = age90Year - state.settings.currentYear;
  const tradAt90NoConv = (bobIRA?.balance ?? 0) * Math.pow(1.06, Math.max(0, yearsTo90));
  const taxNoConv = (tradAt90NoConv / numChildren / 10) * 0.22 * 10 * numChildren;

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-[#1B3A6B]">Tax Impact at Death (Age 90 Projection)</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* With conversions */}
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5 space-y-3">
          <div className="text-sm font-semibold text-green-700 uppercase tracking-wide">With Roth Conversions</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Traditional IRA balance at 90</span>
              <span className="font-medium text-slate-700">{formatCurrency(tradBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Per child ({numChildren} children, 10-yr rule)</span>
              <span className="font-medium text-slate-700">{formatCurrency(perChildTrad)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Annual withdrawal / child</span>
              <span className="font-medium text-slate-700">{formatCurrency(perChildAnnual)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-600">Total inheritance tax (22%)</span>
              <span className="font-semibold text-red-600">{formatCurrency(totalInheritanceTax)}</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-[#1B3A6B]">
            <strong>Roth IRA ({formatCurrency(rothBalance)}):</strong> $0 tax — inherited Roth distributions are tax-free.
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <strong>Brokerage ({formatCurrency(brokerageBalance)}):</strong> Stepped-up basis at death — $0 capital gains tax on appreciation.
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <strong>Real Estate:</strong> Stepped-up basis at death — $0 capital gains on appreciation.
          </div>
        </div>

        {/* Without conversions */}
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 space-y-3">
          <div className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Without Roth Conversions</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Traditional IRA at 90 (6% growth, no conv.)</span>
              <span className="font-medium text-slate-700">{formatCurrency(tradAt90NoConv)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-600">Total inheritance tax (22%)</span>
              <span className="font-semibold text-red-600">{formatCurrency(taxNoConv)}</span>
            </div>
            <div className="flex justify-between bg-green-50 rounded-lg p-2 mt-2">
              <span className="text-green-700 font-medium">Tax savings from conversions</span>
              <span className="font-bold text-green-700">{formatCurrency(taxNoConv - totalInheritanceTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* WA Estate Tax */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h4 className="font-semibold text-slate-700 mb-3">Washington State Estate Tax</h4>
        <p className="text-sm text-slate-500 mb-3">
          WA estate tax threshold: {formatCurrency(WA_ESTATE_TAX_THRESHOLD)}. Total projected estate at age 90:{" "}
          <span className="font-medium text-slate-700">{formatCurrency(totalEstate)}</span>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Without Bypass Trust</div>
            <div className="font-bold text-red-600">WA Tax: {formatCurrency(waNoBypass)}</div>
            <div className="text-xs text-slate-500 mt-1">Threshold: {formatCurrency(WA_ESTATE_TAX_THRESHOLD)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">With Bypass Trust</div>
            <div className="font-bold text-green-600">WA Tax: {formatCurrency(waWithBypass)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Threshold: {formatCurrency(WA_ESTATE_TAX_THRESHOLD * 2)} (doubled for MFJ)
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Savings with Bypass Trust</div>
            <div className="font-bold text-[#1B3A6B]">Saves: {formatCurrency(waSavings)}</div>
            <div className="text-xs text-slate-500 mt-1">Consult an estate attorney.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gift Tracker Panel ───────────────────────────────────────────────────────

function GiftTracker() {
  const { state, simulation, dispatch } = useApp();
  const { settings } = state;
  const [numRecipients, setNumRecipients] = useState(3);
  const [includeInExpenses, setIncludeInExpenses] = useState(false);

  const GIFT_PER_PERSON = 19000; // 2025+
  const numGivers = 2;
  const maxAnnualGifts = GIFT_PER_PERSON * numGivers * numRecipients;

  const currentYear = settings.currentYear;
  const endYear = currentYear + 20;
  const years = Array.from({ length: endYear - currentYear + 1 }, (_, i) => currentYear + i);
  const totalGifts = maxAnnualGifts * years.length;

  // SS survivor benefit
  const personA = state.persons.find((p) => p.id === "personA");
  const ssA = state.socialSecurity.find((ss) => ss.personId === "personA");
  const bobMonthly = ssA?.benefitAt70 ?? 0;
  const bobAnnual = bobMonthly * 12;
  const lastSimYear = simulation[simulation.length - 1];
  const projectedExpenses = lastSimYear?.totalExpenses ?? 0;
  const survivorCoverage = projectedExpenses > 0 ? bobAnnual / projectedExpenses : 0;

  const chartData = years.slice(0, 15).map((year, i) => ({
    year,
    cumulative: maxAnnualGifts * (i + 1),
  }));

  function handleToggleExpenses(checked: boolean) {
    setIncludeInExpenses(checked);
    if (checked) {
      // Add as an expense if not already present
      const existingGift = state.expenses.find((e) => e.name === "Annual Gifts");
      if (!existingGift) {
        dispatch({
          type: "ADD_EXPENSE",
          payload: {
            id: `expense-gifts-${Date.now()}`,
            name: "Annual Gifts",
            annualAmount: maxAnnualGifts,
            startYear: currentYear,
            endYear: currentYear + 20,
            inflationAdjusted: false,
            type: "OTHER",
          },
        });
      }
    } else {
      const giftExpense = state.expenses.find((e) => e.name === "Annual Gifts");
      if (giftExpense) {
        dispatch({ type: "DELETE_EXPENSE", payload: giftExpense.id });
      }
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-[#1B3A6B]">Annual Gift Tracker</h3>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="block text-slate-500 mb-1">Gift per person/giver</label>
            <div className="font-semibold text-slate-700">{formatCurrency(GIFT_PER_PERSON)}</div>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Number of givers</label>
            <div className="font-semibold text-slate-700">{numGivers}</div>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Recipients</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numRecipients}
              onChange={(e) => setNumRecipients(Number(e.target.value))}
              className="border border-slate-200 rounded px-2 py-1 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Max Annual Gifts</label>
            <div className="font-bold text-[#1B3A6B] text-lg">{formatCurrency(maxAnnualGifts)}</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-sm text-[#1B3A6B]">
          Max annual gifts = {formatCurrency(GIFT_PER_PERSON)} × {numGivers} givers × {numRecipients} recipients
          = <strong>{formatCurrency(maxAnnualGifts)}/year</strong> — total over 20 years: <strong>{formatCurrency(totalGifts)}</strong>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="includeGifts"
            checked={includeInExpenses}
            onChange={(e) => handleToggleExpenses(e.target.checked)}
            className="w-4 h-4 accent-[#1B3A6B]"
          />
          <label htmlFor="includeGifts" className="text-sm text-slate-700">
            Include annual gifts in withdrawal strategy (adds as expense)
          </label>
        </div>

        {/* Cumulative gifts chart */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cumulative Gifts Over Time</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              <Line type="monotone" dataKey="cumulative" stroke="#4A6FA5" dot={false} strokeWidth={2} name="Cumulative Gifts" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Survivor benefit note */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-[#4A6FA5] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#1B3A6B]">
          <strong>Survivor Benefit Note:</strong> If {personA?.name ?? "Bob"} passes first, Spouse receives{" "}
          {personA?.name ?? "Bob"}'s full SS benefit ({formatCurrency(bobMonthly)}/mo = {formatCurrency(bobAnnual)}/yr).
          Survivor income covers approximately <strong>{Math.round(survivorCoverage * 100)}%</strong> of projected
          expenses ({formatCurrency(projectedExpenses)}/yr).
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Inheritance() {
  const [activePanel, setActivePanel] = useState<"estate" | "tax" | "gifts">("estate");

  const panels = [
    { id: "estate" as const, label: "Estate Projection" },
    { id: "tax" as const, label: "Tax Impact" },
    { id: "gifts" as const, label: "Gift Tracker" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B3A6B]">Inheritance & Estate Planning</h2>
        <p className="text-slate-500 mt-1">
          Estate projections, inheritance tax impact, and annual gifting strategy.
        </p>
      </div>

      {/* Panel tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-semibold transition-all",
              activePanel === p.id
                ? "bg-[#1B3A6B] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePanel === "estate" && <EstateProjection />}
      {activePanel === "tax" && <TaxImpact />}
      {activePanel === "gifts" && <GiftTracker />}
    </div>
  );
}
