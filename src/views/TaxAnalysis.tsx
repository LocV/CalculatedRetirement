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
} from "recharts";
import { Download } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { YearResult } from "../types";
import { formatCurrency, formatPercent, cn } from "../utils/formatters";

// ─── Bracket Utilization Chart ────────────────────────────────────────────────

function BracketChart({ yr }: { yr: YearResult }) {
  const data = yr.taxResult.bracketUtilization.map((b) => ({
    rate: `${(b.rate * 100).toFixed(0)}%`,
    amount: b.amountInBracket,
    tax: b.taxPaid,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mt-4">
      <h3 className="font-semibold text-[#1B3A6B] mb-3">
        Bracket Utilization — {yr.year} (Ages {yr.ageA}/{yr.ageB})
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="rate" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
          <Legend />
          <Bar dataKey="amount" fill="#4A6FA5" name="Income in Bracket" radius={[3, 3, 0, 0]} />
          <Bar dataKey="tax" fill="#1B3A6B" name="Tax Paid" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(rows: YearResult[]) {
  const headers = [
    "Year", "Age A", "Age B", "Gross Income", "Std Deduction", "Taxable Income",
    "10%", "12%", "22%", "24%", "32%+", "LTCG Tax", "Total Fed Tax",
    "Effective Rate", "Marginal Rate", "MAGI", "IRMAA", "Roth Conv",
    "22% Headroom", "24% Headroom",
  ];

  function bracket(yr: YearResult, rate: number) {
    return yr.taxResult.bracketUtilization.find((b) => b.rate === rate)?.amountInBracket ?? 0;
  }

  const csvRows = rows.map((yr) => [
    yr.year,
    yr.ageA,
    yr.ageB,
    yr.taxResult.grossIncome,
    yr.taxResult.standardDeduction,
    yr.taxResult.taxableOrdinaryIncome,
    bracket(yr, 0.10),
    bracket(yr, 0.12),
    bracket(yr, 0.22),
    bracket(yr, 0.24),
    (bracket(yr, 0.32) + bracket(yr, 0.35) + bracket(yr, 0.37)),
    yr.taxResult.ltcgTax,
    yr.taxResult.totalFederalTax,
    (yr.taxResult.effectiveRate * 100).toFixed(2) + "%",
    (yr.taxResult.marginalRate * 100).toFixed(0) + "%",
    yr.taxResult.magi,
    yr.irmaaTriggered ? "Yes" : "No",
    yr.income.rothConversion,
    "",
    "",
  ]);

  const csvContent = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tax_analysis.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TaxAnalysis() {
  const { state, simulation } = useApp();
  const currentYear = state.settings.currentYear;
  const lastYear = currentYear + 30;

  const [filterStart, setFilterStart] = useState(currentYear);
  const [filterEnd, setFilterEnd] = useState(lastYear);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const visibleYears = simulation.filter(
    (yr) => yr.year >= filterStart && yr.year <= filterEnd
  );

  const selectedRow = selectedYear != null
    ? simulation.find((yr) => yr.year === selectedYear) ?? null
    : null;

  function bracket(yr: YearResult, rate: number) {
    return yr.taxResult.bracketUtilization.find((b) => b.rate === rate)?.amountInBracket ?? 0;
  }

  const allYears = simulation.map((yr) => yr.year);
  const minYear = allYears[0] ?? currentYear;
  const maxYear = allYears[allYears.length - 1] ?? lastYear;

  return (
    <div className="max-w-full space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1B3A6B]">Tax Analysis</h2>
          <p className="text-slate-500 mt-1">Year-by-year federal tax breakdown with bracket utilization.</p>
        </div>
        <button
          onClick={() => exportCSV(visibleYears)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600 font-medium">Start Year:</label>
          <select
            value={filterStart}
            onChange={(e) => setFilterStart(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
          >
            {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600 font-medium">End Year:</label>
          <select
            value={filterEnd}
            onChange={(e) => setFilterEnd(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
          >
            {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm" style={{ maxHeight: "65vh" }}>
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-20">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 z-30 bg-slate-50 border-b border-slate-200">Year</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-[60px] z-30 bg-slate-50 border-b border-slate-200">Ages</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Gross Income</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Std Ded.</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Taxable Inc.</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">10%</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">12%</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 bg-yellow-50">22%</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 bg-yellow-50">24%</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">32%+</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">LTCG Tax</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Total Fed Tax</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Eff. Rate</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Marg. Rate</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">MAGI</th>
              <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">IRMAA</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">Roth Conv.</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 bg-yellow-50">22% Room</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 bg-yellow-50">24% Room</th>
            </tr>
          </thead>
          <tbody>
            {visibleYears.map((yr) => {
              const b32plus = bracket(yr, 0.32) + bracket(yr, 0.35) + bracket(yr, 0.37);
              const taxable = yr.taxResult.taxableOrdinaryIncome;

              // Headroom calc using simple approach
              let headroom22 = 0;
              let headroom24 = 0;

              for (const b of yr.taxResult.bracketUtilization) {
                if (b.rate === 0.22) headroom22 = 0; // already in 22% — show 0 remaining
              }

              // Find bracket tops from utilization
              const bracketRates = yr.taxResult.bracketUtilization.map((b) => b.rate);
              if (!bracketRates.includes(0.22)) {
                // haven't reached 22% yet
                // rough estimate from tax constants for MFJ 2026: 22% starts at 96951
                const BRACKET_22_TOP = 206700;
                headroom22 = Math.max(0, BRACKET_22_TOP - taxable);
              }
              if (!bracketRates.includes(0.24)) {
                const BRACKET_24_TOP = 394600;
                headroom24 = Math.max(0, BRACKET_24_TOP - taxable);
              }

              return (
                <tr
                  key={yr.year}
                  onClick={() => setSelectedYear(yr.year === selectedYear ? null : yr.year)}
                  className={cn(
                    "border-t border-slate-100 cursor-pointer transition-colors",
                    selectedYear === yr.year ? "ring-2 ring-inset ring-[#4A6FA5]" : "",
                    yr.irmaaTriggered ? "bg-yellow-50" : "bg-white hover:bg-slate-50"
                  )}
                >
                  <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-inherit border-r border-slate-100">
                    {yr.year}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap sticky left-[60px] bg-inherit border-r border-slate-100">
                    {yr.ageA}/{yr.ageB}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(yr.taxResult.grossIncome)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(yr.taxResult.standardDeduction)}</td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">{formatCurrency(yr.taxResult.taxableOrdinaryIncome)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(bracket(yr, 0.10))}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(bracket(yr, 0.12))}</td>
                  <td className="px-3 py-2 text-right text-slate-700 bg-yellow-50/60">{formatCurrency(bracket(yr, 0.22))}</td>
                  <td className="px-3 py-2 text-right text-slate-700 bg-yellow-50/60">{formatCurrency(bracket(yr, 0.24))}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(b32plus)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(yr.taxResult.ltcgTax)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-[#1B3A6B]">{formatCurrency(yr.taxResult.totalFederalTax)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatPercent(yr.taxResult.effectiveRate)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatPercent(yr.taxResult.marginalRate, 0)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(yr.taxResult.magi)}</td>
                  <td className="px-3 py-2 text-center">
                    {yr.irmaaTriggered ? (
                      <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">IRMAA</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(yr.income.rothConversion)}</td>
                  <td className="px-3 py-2 text-right text-slate-600 bg-yellow-50/60">{formatCurrency(headroom22)}</td>
                  <td className="px-3 py-2 text-right text-slate-600 bg-yellow-50/60">{formatCurrency(headroom24)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bracket chart for selected year */}
      {selectedRow && <BracketChart yr={selectedRow} />}

      <p className="text-xs text-slate-400 italic">
        Click any row to view bracket utilization chart. Yellow columns = Roth sweet spot (22%/24%).
      </p>
    </div>
  );
}
