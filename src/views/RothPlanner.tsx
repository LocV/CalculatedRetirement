import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Info } from "lucide-react";
import { useApp } from "../context/AppContext";
import { AccountType } from "../types";
import type { RothConversionEntry } from "../types";
import { formatCurrency, formatPercent, cn } from "../utils/formatters";
import { getBracketHeadroom } from "../engine/taxEngine";

// ─── IRMAA tier check ─────────────────────────────────────────────────────────

function getIRMAATier(magi: number): { tier: number; label: string; color: string } {
  if (magi <= 212000) return { tier: 0, label: "No IRMAA", color: "text-green-600" };
  if (magi <= 266000) return { tier: 1, label: "IRMAA Tier 1 (+$2,600/yr)", color: "text-yellow-600" };
  if (magi <= 334000) return { tier: 2, label: "IRMAA Tier 2 (+$6,452/yr)", color: "text-orange-600" };
  if (magi <= 402000) return { tier: 3, label: "IRMAA Tier 3 (+$10,174/yr)", color: "text-red-500" };
  if (magi <= 750000) return { tier: 4, label: "IRMAA Tier 4 (+$13,918/yr)", color: "text-red-600" };
  return { tier: 5, label: "IRMAA Tier 5 (+$15,178/yr)", color: "text-red-700" };
}

// ─── Conversion Summary Panel ─────────────────────────────────────────────────

function ConversionSummary() {
  const { state, simulation } = useApp();
  const { accounts } = state;

  const totalConverted = simulation.reduce((sum, yr) => {
    return sum + Object.values(yr.rothConversions).reduce((s, v) => s + v, 0);
  }, 0);

  const tradIRAAccount = accounts.find(
    (a) => a.type === AccountType.TRADITIONAL_IRA && a.owner === "personA"
  );

  // With conversions — look up from simulation at age 73
  const bobBirthYear = state.persons.find((p) => p.id === "personA")?.birthYear ?? 1975;
  const age73Year = bobBirthYear + 73;
  const simAt73 = simulation.find((yr) => yr.year === age73Year);
  const balanceAt73With = tradIRAAccount ? (simAt73?.accountEndBalances[tradIRAAccount.id] ?? 0) : 0;

  // Without conversions — grow at 6% from current balance
  const currentBalance = tradIRAAccount?.balance ?? 0;
  const yearsTo73 = age73Year - (state.settings.currentYear);
  const balanceAt73Without = currentBalance * Math.pow(1.06, Math.max(0, yearsTo73));

  // RMD at 73 — balance / 26.5 (uniform lifetime table)
  const rmdWith = balanceAt73With / 26.5;
  const rmdWithout = balanceAt73Without / 26.5;

  // Estimated lifetime tax savings (rough: RMD difference * 22% * 20 years)
  const rmdDifference = rmdWithout - rmdWith;
  const lifetimeTaxSavings = rmdDifference * 0.22 * 20;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-[#1B3A6B] text-base">Conversion Summary</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-slate-500">Total Converted (to date)</div>
          <div className="text-xl font-bold text-[#1B3A6B]">{formatCurrency(totalConverted)}</div>
        </div>
        <div>
          <div className="text-slate-500">Est. Lifetime Tax Savings</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(lifetimeTaxSavings)}</div>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Traditional IRA Balance at Age 73
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-0.5">With Conversions</div>
            <div className="font-bold text-[#1B3A6B]">{formatCurrency(balanceAt73With)}</div>
            <div className="text-xs text-slate-400 mt-1">RMD: {formatCurrency(rmdWith)}/yr</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-0.5">Without Conversions</div>
            <div className="font-bold text-amber-700">{formatCurrency(balanceAt73Without)}</div>
            <div className="text-xs text-slate-400 mt-1">RMD: {formatCurrency(rmdWithout)}/yr</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Conversion Chart ─────────────────────────────────────────────────────────

function ConversionChart() {
  const { state, simulation } = useApp();
  const { accounts } = state;

  const tradIRAAccount = accounts.find(
    (a) => a.type === AccountType.TRADITIONAL_IRA && a.owner === "personA"
  );

  const chartData = simulation
    .filter((yr) => yr.year >= 2026 && yr.year <= 2045)
    .map((yr) => ({
      year: yr.year,
      conversion: Object.values(yr.rothConversions).reduce((s, v) => s + v, 0),
      tradBalance: tradIRAAccount ? (yr.accountEndBalances[tradIRAAccount.id] ?? 0) : 0,
    }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-semibold text-[#1B3A6B] text-base mb-4">Conversion & IRA Balance Over Time</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => formatCurrency(v, true)}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => formatCurrency(v, true)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value ?? 0)),
              name === "conversion" ? "Roth Conversion" : "Trad IRA Balance",
            ]}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="conversion" fill="#4A6FA5" name="Roth Conversion" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tradBalance"
            stroke="#1B3A6B"
            name="Trad IRA Balance"
            dot={false}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RothPlanner() {
  const { state, simulation, dispatch } = useApp();
  const { rothConversionPlan, settings, accounts } = state;

  const planYears: number[] = [];
  for (let y = 2026; y <= 2042; y++) planYears.push(y);

  const bobBirthYear = state.persons.find((p) => p.id === "personA")?.birthYear ?? 1975;
  const tradIRAAccount = accounts.find(
    (a) => a.type === AccountType.TRADITIONAL_IRA && a.owner === "personA"
  );
  const rothIRAAccount = accounts.find(
    (a) => a.type === AccountType.ROTH_IRA && a.owner === "personA"
  );

  function getSimYear(year: number) {
    return simulation.find((yr) => yr.year === year);
  }

  function getEntry(year: number): RothConversionEntry | undefined {
    return rothConversionPlan.entries.find((e) => e.year === year);
  }

  function getConversionAmount(year: number): number {
    const entry = getEntry(year);
    if (!entry || typeof entry.amount !== "number") return 0;
    return entry.amount;
  }

  function setConversionAmount(year: number, amount: number) {
    const fromId = tradIRAAccount?.id ?? "";
    const toId = rothIRAAccount?.id ?? "";
    const entries = rothConversionPlan.entries.filter((e) => e.year !== year);
    if (amount > 0) {
      entries.push({ year, fromAccountId: fromId, toAccountId: toId, amount });
    }
    dispatch({
      type: "UPDATE_ROTH_CONVERSION_PLAN",
      payload: { entries },
    });
  }

  function fillToBracket(year: number, rate: number) {
    const simYear = getSimYear(year);
    if (!simYear) return;
    const taxableIncome = simYear.taxResult.taxableOrdinaryIncome;
    const headroom = getBracketHeadroom(taxableIncome, rate, settings, settings.taxYear);
    setConversionAmount(year, Math.round(headroom));
  }

  const ACA_THRESHOLD = 83000;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B3A6B]">Roth Conversion Planner</h2>
        <p className="text-slate-500 mt-1">
          Strategically convert traditional IRA funds to Roth to minimize lifetime taxes.
        </p>
      </div>

      {/* ACA Note */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-[#4A6FA5] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#1B3A6B]">
          <span className="font-semibold">ACA Subsidy Note:</span> At projected conversion amounts, MAGI will exceed
          the ACA subsidy threshold ({formatCurrency(ACA_THRESHOLD)} for 2026 MFJ). Budget full marketplace
          premiums (~$22,000–$30,000/year) as a retirement expense. Roth conversion savings significantly
          outweigh any lost subsidy.
        </div>
      </div>

      {/* Per-Year Conversion Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50">Year</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Bob's Age</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Ord. Income</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap bg-yellow-50">22% Headroom</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap bg-yellow-50">24% Headroom</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap min-w-[280px]">Conversion Amount</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Tax Cost</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">Eff. Rate</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">MAGI w/ Conv.</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">IRMAA</th>
              </tr>
            </thead>
            <tbody>
              {planYears.map((year) => {
                const simYear = getSimYear(year);
                const convAmount = getConversionAmount(year);
                const bobAge = year - bobBirthYear;
                const taxableIncome = simYear?.taxResult.taxableOrdinaryIncome ?? 0;
                const ordinaryIncome = simYear?.taxResult.grossIncome ?? 0;
                const headroom22 = getBracketHeadroom(taxableIncome, 0.22, settings, settings.taxYear);
                const headroom24 = getBracketHeadroom(taxableIncome, 0.24, settings, settings.taxYear);

                // Tax cost of conversion (approx at 22%)
                const taxCost = convAmount * (simYear?.taxResult.marginalRate ?? 0.22);
                const effRateOnConv = convAmount > 0 ? taxCost / convAmount : 0;

                // MAGI with conversion
                const baseMagi = simYear?.taxResult.magi ?? 0;
                const magiWithConv = baseMagi + convAmount;
                const irmaaInfo = getIRMAATier(magiWithConv);

                return (
                  <tr
                    key={year}
                    className={cn(
                      "border-t border-slate-100",
                      irmaaInfo.tier >= 1 ? "bg-yellow-50/40" : "bg-white"
                    )}
                  >
                    <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-inherit">{year}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{bobAge}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(ordinaryIncome)}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700 bg-yellow-50/60">
                      {headroom22 === Infinity ? "—" : formatCurrency(headroom22)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700 bg-yellow-50/60">
                      {headroom24 === Infinity ? "—" : formatCurrency(headroom24)}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={convAmount}
                          onChange={(e) => setConversionAmount(year, Number(e.target.value))}
                          className="w-28 text-right border border-slate-200 rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => fillToBracket(year, 0.22)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap"
                        >
                          Fill 22%
                        </button>
                        <button
                          onClick={() => fillToBracket(year, 0.24)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap"
                        >
                          Fill 24%
                        </button>
                        <button
                          onClick={() => fillToBracket(year, 0.32)}
                          className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 whitespace-nowrap"
                        >
                          Fill 32%
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(taxCost)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatPercent(effRateOnConv)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(magiWithConv)}</td>
                    <td className="px-3 py-2">
                      {irmaaInfo.tier >= 1 ? (
                        <div className={cn("flex items-center gap-1 text-xs font-medium", irmaaInfo.color)}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {irmaaInfo.label}
                        </div>
                      ) : (
                        <span className="text-xs text-green-600">No IRMAA</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionSummary />
        <ConversionChart />
      </div>
    </div>
  );
}
