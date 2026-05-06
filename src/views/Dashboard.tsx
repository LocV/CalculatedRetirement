import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Briefcase,
  Heart,
  Clock,
  DollarSign,
  Shield,
  Calendar,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatCurrency, cn } from "../utils/formatters";
import type { YearResult } from "../types";

// ============================================================
// Palette
// ============================================================
const ACCOUNT_COLORS: Record<string, string> = {
  TRADITIONAL_IRA: "#4A6FA5",
  ROTH_IRA: "#22c55e",
  "401K_TRADITIONAL": "#1B3A6B",
  "401K_ROTH": "#16a34a",
  BROKERAGE: "#7c3aed",
  HSA: "#0891b2",
  SAVINGS_CASH: "#94a3b8",
  PENSION: "#f59e0b",
};

const INCOME_COLORS: Record<string, string> = {
  w2: "#4A6FA5",
  ssA: "#22c55e",
  ssB: "#16a34a",
  rentalNet: "#f59e0b",
  pension: "#f97316",
  traditionalWithdrawals: "#7c3aed",
  brokerageWithdrawals: "#0891b2",
  rothConversion: "#94a3b8",
};

// ============================================================
// Helpers
// ============================================================
function getReadinessStatus(simulation: YearResult[]): "green" | "yellow" | "red" {
  const shortfallYears = simulation.filter((y) => y.hasShortfall);
  if (shortfallYears.length === 0) return "green";
  const earlyShortfall = shortfallYears.some((y) => y.ageA < 80);
  return earlyShortfall ? "red" : "yellow";
}

// ============================================================
// Sub-components
// ============================================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

function MetricCard({ title, value, subtitle, icon, badge }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
      {badge && <div className="mt-1">{badge}</div>}
    </div>
  );
}

interface ReadinessCardProps {
  status: "green" | "yellow" | "red";
}

function ReadinessCard({ status }: ReadinessCardProps) {
  const configs = {
    green: {
      label: "On Track",
      sub: "No shortfalls projected",
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
    },
    yellow: {
      label: "Caution",
      sub: "Shortfalls after age 80",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
    },
    red: {
      label: "At Risk",
      sub: "Shortfalls before age 80",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
    },
  };
  const c = configs[status];
  return (
    <div className={cn("rounded-xl border p-5 flex flex-col gap-2 shadow-sm", c.bg, c.border)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Retirement Readiness</span>
        {c.icon}
      </div>
      <div className={cn("text-2xl font-bold", c.text)}>{c.label}</div>
      <div className="text-sm text-slate-500">{c.sub}</div>
    </div>
  );
}

// ============================================================
// Quick Adjust Panel
// ============================================================
interface QuickAdjustProps {
  returnRate: number;
  inflationRate: number;
  lifeExpectancy: number;
  onChange: (key: string, value: number) => void;
}

function QuickAdjustPanel({ returnRate, inflationRate, lifeExpectancy, onChange }: QuickAdjustProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Info className="w-4 h-4 text-blue-500" />
        <p className="text-xs text-slate-500 italic">
          These are view-only overrides. Use Settings to save permanently.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-slate-700">Investment Return Rate</label>
          <span className="text-sm font-bold text-[#1B3A6B]">{(returnRate * 100).toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          step={0.1}
          value={returnRate * 100}
          onChange={(e) => onChange("returnRateOverride", parseFloat(e.target.value) / 100)}
          className="w-full accent-[#4A6FA5]"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>1%</span><span>12%</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-slate-700">Inflation Rate</label>
          <span className="text-sm font-bold text-[#1B3A6B]">{(inflationRate * 100).toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={8}
          step={0.1}
          value={inflationRate * 100}
          onChange={(e) => onChange("inflationRate", parseFloat(e.target.value) / 100)}
          className="w-full accent-[#4A6FA5]"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>0%</span><span>8%</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-slate-700">Life Expectancy</label>
          <span className="text-sm font-bold text-[#1B3A6B]">{lifeExpectancy} yrs</span>
        </div>
        <input
          type="range"
          min={75}
          max={100}
          step={1}
          value={lifeExpectancy}
          onChange={(e) => onChange("lifeExpectancyOverride", parseInt(e.target.value))}
          className="w-full accent-[#4A6FA5]"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>75</span><span>100</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Milestone Timeline
// ============================================================
interface Milestone {
  year: number;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const sorted = [...milestones].sort((a, b) => a.year - b.year);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-0 items-stretch min-w-max">
        {sorted.map((m, i) => (
          <div key={i} className="flex flex-col items-center" style={{ minWidth: 120 }}>
            <div
              className={cn(
                "rounded-full p-2 mb-2 border-2",
                m.color
              )}
            >
              {m.icon}
            </div>
            <div className="text-xs font-semibold text-slate-700 text-center px-1 leading-tight">{m.label}</div>
            <div className="text-xs text-slate-400 mt-1 font-mono">{m.year}</div>
            {i < sorted.length - 1 && (
              <div className="absolute" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Custom Tooltip
// ============================================================
function CurrencyTooltip(props: Record<string, unknown>) {
  const active = props.active as boolean | undefined;
  const payload = props.payload as Array<{ name: string; value: number; color: string }> | undefined;
  const label = props.label as string | undefined;
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{formatCurrency(p.value, true)}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Dashboard
// ============================================================
export default function Dashboard() {
  const { state, simulation, dispatch } = useApp();
  const [quickAdjustOpen, setQuickAdjustOpen] = useState(false);

  // ── Derived: current net worth
  const currentNetWorth = useMemo(
    () => state.accounts.reduce((sum, a) => sum + a.balance, 0),
    [state.accounts]
  );

  // ── Simulation lookups
  const yearAt70 = useMemo(() => simulation.find((y) => y.ageA === 70), [simulation]);
  const yearAt80 = useMemo(() => simulation.find((y) => y.ageA === 80), [simulation]);
  const firstYear = simulation[0];

  // ── Readiness
  const readinessStatus = useMemo(() => getReadinessStatus(simulation), [simulation]);

  // ── Alert banners
  const hasAnyShortfall = simulation.some((y) => y.hasShortfall);
  const firstIrmaaYear = simulation.find((y) => y.irmaaTriggered);
  const hasRothConversion = state.rothConversionPlan.entries.length > 0;

  // ── Quick Adjust values
  const returnRate = state.settings.returnRateOverride ?? 0.06;
  const inflationRate = state.settings.inflationRate;
  const lifeExpectancy = state.settings.lifeExpectancyOverride ?? state.settings.planningHorizonAge;

  const handleQuickAdjust = (key: string, value: number) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { [key]: value } as Parameters<typeof dispatch>[0] extends { type: "UPDATE_SETTINGS"; payload: infer P } ? P : never });
  };

  // ── Portfolio area chart data: per account type over time
  const portfolioChartData = useMemo(() => {
    return simulation.map((yr) => {
      const row: Record<string, unknown> = { year: yr.year };
      // Group balances by account type
      state.accounts.forEach((acct) => {
        const bal = yr.accountEndBalances[acct.id] ?? 0;
        const key = acct.type as string;
        row[key] = ((row[key] as number) ?? 0) + bal;
      });
      return row;
    });
  }, [simulation, state.accounts]);

  const uniqueAccountTypes = useMemo(() => {
    const types = new Set(state.accounts.map((a) => a.type as string));
    return Array.from(types);
  }, [state.accounts]);

  // ── Income bar chart: current year + next 10
  const incomeChartData = useMemo(() => {
    if (!firstYear) return [];
    const startYear = firstYear.year;
    return simulation
      .filter((y) => y.year >= startYear && y.year <= startYear + 10)
      .map((yr) => ({
        year: yr.year,
        "W-2": yr.income.w2,
        "Social Security A": yr.income.ssA,
        "Social Security B": yr.income.ssB,
        Rental: yr.income.rentalNet,
        Pension: yr.income.pension,
        Withdrawals: yr.income.traditionalWithdrawals + yr.income.brokerageWithdrawals,
        "Roth Conversion": yr.income.rothConversion,
      }));
  }, [simulation, firstYear]);

  // ── Net worth line chart
  const netWorthData = useMemo(() => {
    return simulation.map((yr) => ({
      year: yr.year,
      "Net Worth": yr.totalAssets,
    }));
  }, [simulation]);

  // ── Tax chart
  const taxChartData = useMemo(() => {
    return simulation.map((yr) => ({
      year: yr.year,
      "Federal Tax": yr.taxResult.totalFederalTax,
      "Effective Rate %": yr.taxResult.effectiveRate * 100,
    }));
  }, [simulation]);

  // ── Milestones
  const milestones = useMemo((): Milestone[] => {
    const persons = state.persons;
    const ss = state.socialSecurity;
    const items: Milestone[] = [];

    if (persons[0]) {
      items.push({
        year: persons[0].retirementYear,
        label: `${persons[0].name} Retires`,
        icon: <Briefcase className="w-4 h-4" />,
        color: "bg-blue-50 border-blue-400 text-blue-600",
      });
      items.push({
        year: persons[0].birthYear + 60,
        label: `${persons[0].name} Age 59½`,
        icon: <Clock className="w-4 h-4" />,
        color: "bg-purple-50 border-purple-400 text-purple-600",
      });
      items.push({
        year: persons[0].birthYear + 65,
        label: `${persons[0].name} Medicare`,
        icon: <Heart className="w-4 h-4" />,
        color: "bg-green-50 border-green-400 text-green-600",
      });
      items.push({
        year: persons[0].birthYear + 73,
        label: `${persons[0].name} RMD Start`,
        icon: <DollarSign className="w-4 h-4" />,
        color: "bg-orange-50 border-orange-400 text-orange-600",
      });
    }

    if (persons[1]) {
      items.push({
        year: persons[1].retirementYear,
        label: `${persons[1].name} Retires`,
        icon: <Briefcase className="w-4 h-4" />,
        color: "bg-blue-50 border-blue-300 text-blue-500",
      });
      items.push({
        year: persons[1].birthYear + 65,
        label: `${persons[1].name} Medicare`,
        icon: <Heart className="w-4 h-4" />,
        color: "bg-green-50 border-green-300 text-green-500",
      });
      items.push({
        year: persons[1].birthYear + 73,
        label: `${persons[1].name} RMD Start`,
        icon: <DollarSign className="w-4 h-4" />,
        color: "bg-orange-50 border-orange-300 text-orange-500",
      });
    }

    if (ss[0] && persons[0]) {
      items.push({
        year: persons[0].birthYear + ss[0].claimAge,
        label: `${persons[0].name} SS Claim`,
        icon: <Shield className="w-4 h-4" />,
        color: "bg-emerald-50 border-emerald-400 text-emerald-600",
      });
    }

    if (ss[1] && persons[1] && (ss[1].benefitAt67 > 0 || ss[1].benefitAt62 > 0)) {
      items.push({
        year: persons[1].birthYear + ss[1].claimAge,
        label: `${persons[1].name} SS Claim`,
        icon: <Shield className="w-4 h-4" />,
        color: "bg-emerald-50 border-emerald-300 text-emerald-500",
      });
    }

    const minBirth = Math.min(...persons.map((p) => p.birthYear));
    items.push({
      year: minBirth + state.settings.planningHorizonAge,
      label: "Planning Horizon",
      icon: <Calendar className="w-4 h-4" />,
      color: "bg-slate-50 border-slate-400 text-slate-600",
    });

    return items;
  }, [state.persons, state.socialSecurity, state.settings.planningHorizonAge]);

  const accountTypeLabel: Record<string, string> = {
    TRADITIONAL_IRA: "Traditional IRA",
    ROTH_IRA: "Roth IRA",
    "401K_TRADITIONAL": "401(k) Traditional",
    "401K_ROTH": "401(k) Roth",
    BROKERAGE: "Brokerage",
    HSA: "HSA",
    SAVINGS_CASH: "Cash",
    PENSION: "Pension",
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Alert Banners ── */}
      {hasAnyShortfall && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            Warning: Your plan projects a cash shortfall in one or more years. Review withdrawals or reduce expenses.
          </span>
        </div>
      )}

      {firstIrmaaYear && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-xl px-4 py-3 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            IRMAA surcharge triggered starting in {firstIrmaaYear.year} (Age {firstIrmaaYear.ageA}). Consider Roth conversions or income smoothing to reduce MAGI.
          </span>
        </div>
      )}

      {!hasRothConversion && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-medium">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>
            No Roth conversion plan is set. Consider adding conversions in the Roth Planner to reduce future RMDs and taxes.
          </span>
        </div>
      )}

      {/* ── Top Metrics Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Current Net Worth"
          value={formatCurrency(currentNetWorth, true)}
          subtitle={`Across ${state.accounts.length} accounts`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Projected at Age 70"
          value={yearAt70 ? formatCurrency(yearAt70.totalAssets, true) : "—"}
          subtitle={yearAt70 ? `Year ${yearAt70.year}` : "Outside horizon"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Projected at Age 80"
          value={yearAt80 ? formatCurrency(yearAt80.totalAssets, true) : "—"}
          subtitle={yearAt80 ? `Year ${yearAt80.year}` : "Outside horizon"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-2 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Annual Income vs Expenses</span>
          {firstYear ? (
            <>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(
                  firstYear.income.w2 +
                  firstYear.income.ssA +
                  firstYear.income.ssB +
                  firstYear.income.rentalNet +
                  firstYear.income.pension +
                  firstYear.income.traditionalWithdrawals +
                  firstYear.income.brokerageWithdrawals,
                  true
                )}
              </div>
              <div className="text-xs text-green-600 font-medium">Income</div>
              <div className="text-lg font-bold text-red-500">{formatCurrency(firstYear.totalExpenses, true)}</div>
              <div className="text-xs text-red-500 font-medium">Expenses</div>
              <div className={cn("text-sm font-semibold mt-1", firstYear.surplus >= 0 ? "text-slate-600" : "text-red-600")}>
                {firstYear.surplus >= 0 ? "+" : ""}{formatCurrency(firstYear.surplus, true)} net
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-sm">No data</div>
          )}
          <div className="flex gap-1 mt-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
        </div>
        <ReadinessCard status={readinessStatus} />
      </div>

      {/* ── Quick Adjust Panel ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          onClick={() => setQuickAdjustOpen((o) => !o)}
        >
          <span className="font-semibold text-slate-700">Quick Adjust Assumptions</span>
          {quickAdjustOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {quickAdjustOpen && (
          <div className="border-t border-slate-100 p-5">
            <QuickAdjustPanel
              returnRate={returnRate}
              inflationRate={inflationRate}
              lifeExpectancy={lifeExpectancy}
              onChange={handleQuickAdjust}
            />
          </div>
        )}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Area: Portfolio over time */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Portfolio Value Over Time</h3>
          {portfolioChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={portfolioChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v, true)} tick={{ fontSize: 11 }} width={70} />
                <Tooltip content={(props) => <CurrencyTooltip {...props} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {uniqueAccountTypes.map((type) => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    name={accountTypeLabel[type] ?? type}
                    stackId="1"
                    stroke={ACCOUNT_COLORS[type] ?? "#94a3b8"}
                    fill={ACCOUNT_COLORS[type] ?? "#94a3b8"}
                    fillOpacity={0.7}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No simulation data</div>
          )}
        </div>

        {/* Stacked Bar: Income by source */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Annual Income by Source (10-Year)</h3>
          {incomeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={incomeChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v, true)} tick={{ fontSize: 11 }} width={70} />
                <Tooltip content={(props) => <CurrencyTooltip {...props} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="W-2" stackId="a" fill={INCOME_COLORS.w2} />
                <Bar dataKey="Social Security A" stackId="a" fill={INCOME_COLORS.ssA} />
                <Bar dataKey="Social Security B" stackId="a" fill={INCOME_COLORS.ssB} />
                <Bar dataKey="Rental" stackId="a" fill={INCOME_COLORS.rentalNet} />
                <Bar dataKey="Pension" stackId="a" fill={INCOME_COLORS.pension} />
                <Bar dataKey="Withdrawals" stackId="a" fill={INCOME_COLORS.traditionalWithdrawals} />
                <Bar dataKey="Roth Conversion" stackId="a" fill={INCOME_COLORS.rothConversion} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No simulation data</div>
          )}
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line: Net worth over time */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Net Worth Over Time</h3>
          {netWorthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={netWorthData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatCurrency(v, true)} tick={{ fontSize: 11 }} width={70} />
                <Tooltip content={(props) => <CurrencyTooltip {...props} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Net Worth"
                  stroke="#1B3A6B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No simulation data</div>
          )}
        </div>

        {/* Bar + Line: Federal Tax + Effective Rate */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Federal Tax &amp; Effective Rate</h3>
          {taxChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={taxChartData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v: number) => formatCurrency(v, true)}
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 11 }}
                  width={45}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Effective Rate %" ? `${Number(value ?? 0).toFixed(1)}%` : formatCurrency(Number(value ?? 0), true)
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="Federal Tax" fill="#4A6FA5" opacity={0.8} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Effective Rate %"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">No simulation data</div>
          )}
        </div>
      </div>

      {/* ── Milestone Timeline ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Key Milestones</h3>
        <MilestoneTimeline milestones={milestones} />
      </div>
    </div>
  );
}
