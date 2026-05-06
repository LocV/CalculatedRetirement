import { useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { YearResult } from "../types";
import { formatCurrency, cn } from "../utils/formatters";

// ─── Column group definitions ─────────────────────────────────────────────────

type ColGroup = {
  id: string;
  label: string;
  cols: Array<{
    key: string;
    label: string;
    getValue: (yr: YearResult, real: boolean, inflRate: number, baseYear: number) => string;
  }>;
};

function deflate(value: number, year: number, baseYear: number, rate: number): number {
  const years = year - baseYear;
  return value / Math.pow(1 + rate, years);
}

function makeGroups(
  accounts: Array<{ id: string; name: string }>
): ColGroup[] {
  return [
    {
      id: "time",
      label: "Time",
      cols: [
        { key: "year", label: "Year", getValue: (yr) => String(yr.year) },
        { key: "ageA", label: "Bob's Age", getValue: (yr) => String(yr.ageA) },
        { key: "ageB", label: "Spouse's Age", getValue: (yr) => String(yr.ageB) },
      ],
    },
    {
      id: "balances",
      label: "Account Balances",
      cols: accounts.map((acc) => ({
        key: `bal_${acc.id}`,
        label: acc.name,
        getValue: (yr: YearResult, real: boolean, inflRate: number, base: number) => {
          const v = yr.accountEndBalances[acc.id] ?? 0;
          return formatCurrency(real ? deflate(v, yr.year, base, inflRate) : v);
        },
      })),
    },
    {
      id: "income",
      label: "Income Sources",
      cols: [
        {
          key: "w2",
          label: "W-2",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.income.w2, yr.year, b, r) : yr.income.w2),
        },
        {
          key: "rental",
          label: "Rental Net",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.income.rentalNet, yr.year, b, r) : yr.income.rentalNet),
        },
        {
          key: "ssA",
          label: "SS-Bob",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.income.ssA, yr.year, b, r) : yr.income.ssA),
        },
        {
          key: "ssB",
          label: "SS-Spouse",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.income.ssB, yr.year, b, r) : yr.income.ssB),
        },
        {
          key: "pension",
          label: "Pension",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.income.pension, yr.year, b, r) : yr.income.pension),
        },
      ],
    },
    {
      id: "withdrawals",
      label: "Withdrawals",
      cols: accounts.map((acc) => ({
        key: `wd_${acc.id}`,
        label: acc.name,
        getValue: (yr: YearResult, real: boolean, r: number, b: number) => {
          const v = yr.withdrawals[acc.id] ?? 0;
          return formatCurrency(real ? deflate(v, yr.year, b, r) : v);
        },
      })),
    },
    {
      id: "roth",
      label: "Roth Conversions",
      cols: [
        {
          key: "rothConv",
          label: "Roth Conv.",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.income.rothConversion, yr.year, b, r) : yr.income.rothConversion),
        },
      ],
    },
    {
      id: "rmds",
      label: "RMDs",
      cols: accounts.map((acc) => ({
        key: `rmd_${acc.id}`,
        label: acc.name,
        getValue: (yr: YearResult, real: boolean, r: number, b: number) => {
          const v = yr.rmds[acc.id] ?? 0;
          return v > 0 ? formatCurrency(real ? deflate(v, yr.year, b, r) : v) : "—";
        },
      })),
    },
    {
      id: "tax",
      label: "Tax Summary",
      cols: [
        {
          key: "grossIncome",
          label: "Gross Income",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.taxResult.grossIncome, yr.year, b, r) : yr.taxResult.grossIncome),
        },
        {
          key: "fedTax",
          label: "Federal Tax",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.taxResult.totalFederalTax, yr.year, b, r) : yr.taxResult.totalFederalTax),
        },
        {
          key: "netIncome",
          label: "Net Income",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.netIncome, yr.year, b, r) : yr.netIncome),
        },
      ],
    },
    {
      id: "expenses",
      label: "Expenses",
      cols: [
        {
          key: "totalExpenses",
          label: "Total Expenses",
          getValue: (yr, real, r, b) => formatCurrency(real ? deflate(yr.totalExpenses, yr.year, b, r) : yr.totalExpenses),
        },
        {
          key: "surplus",
          label: "Net Surplus/Deficit",
          getValue: (yr, real, r, b) => {
            const v = yr.surplus;
            return (real ? deflate(v, yr.year, b, r) : v) >= 0
              ? "+" + formatCurrency(real ? deflate(v, yr.year, b, r) : v)
              : formatCurrency(real ? deflate(v, yr.year, b, r) : v);
          },
        },
      ],
    },
  ];
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(
  rows: YearResult[],
  groups: ColGroup[],
  openGroups: Set<string>,
  realValues: boolean,
  inflRate: number,
  baseYear: number
) {
  const visibleCols = groups
    .filter((g) => openGroups.has(g.id))
    .flatMap((g) => g.cols);

  const headers = visibleCols.map((c) => c.label);
  const csvRows = rows.map((yr) =>
    visibleCols.map((c) => c.getValue(yr, realValues, inflRate, baseYear))
  );

  const csvContent = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "year_by_year.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function YearByYear() {
  const { state, simulation } = useApp();
  const { accounts, settings } = state;

  const currentYear = settings.currentYear;
  const allYears = simulation.map((yr) => yr.year);
  const minYear = allYears[0] ?? currentYear;
  const maxYear = allYears[allYears.length - 1] ?? currentYear + 30;

  const [filterStart, setFilterStart] = useState(currentYear);
  const [filterEnd, setFilterEnd] = useState(maxYear);
  const [realValues, setRealValues] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["time", "balances", "income", "tax", "expenses"])
  );

  const groups = makeGroups(accounts);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleRows = simulation.filter(
    (yr) => yr.year >= filterStart && yr.year <= filterEnd
  );

  const visibleGroups = groups.filter((g) => openGroups.has(g.id));

  function rowColor(yr: YearResult) {
    if (yr.hasShortfall) return "bg-red-50";
    if (yr.irmaaTriggered) return "bg-yellow-50";
    if (yr.surplus > yr.totalExpenses * 0.2) return "bg-green-50";
    return "bg-white";
  }

  return (
    <div className="max-w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1B3A6B]">Year-by-Year Simulation</h2>
          <p className="text-slate-500 mt-1">Full simulation table with collapsible column groups.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRealValues(!realValues)}
            className={cn(
              "px-4 py-2 text-sm rounded-lg border transition-colors",
              realValues
                ? "bg-[#1B3A6B] text-white border-[#1B3A6B]"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {realValues ? "Real $" : "Nominal $"}
          </button>
          <button
            onClick={() => exportCSV(visibleRows, groups, openGroups, realValues, settings.inflationRate, currentYear)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600 font-medium">Start:</label>
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
          <label className="text-slate-600 font-medium">End:</label>
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

      {/* Column group toggles */}
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => toggleGroup(g.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors",
              openGroups.has(g.id)
                ? "bg-[#1B3A6B] text-white border-[#1B3A6B]"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            )}
          >
            {openGroups.has(g.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {g.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span>Shortfall</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span>IRMAA triggered</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span>Surplus &gt;20%</span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm" style={{ maxHeight: "65vh" }}>
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20">
            {/* Group headers */}
            <tr className="bg-[#1B3A6B]">
              {visibleGroups.map((g) => (
                <th
                  key={g.id}
                  colSpan={g.cols.length}
                  className="px-3 py-2 text-left text-xs font-semibold text-white/90 uppercase tracking-wide border-r border-white/20"
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {/* Column headers */}
            <tr className="bg-slate-50 border-b border-slate-200">
              {visibleGroups.flatMap((g) =>
                g.cols.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap first:text-left"
                  >
                    {col.label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((yr) => (
              <tr key={yr.year} className={cn("border-t border-slate-100", rowColor(yr))}>
                {visibleGroups.flatMap((g) =>
                  g.cols.map((col, ci) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-1.5 whitespace-nowrap",
                        ci === 0 && g.id === "time" ? "font-medium text-slate-700" : "text-right text-slate-600"
                      )}
                    >
                      {col.getValue(yr, realValues, settings.inflationRate, currentYear)}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
