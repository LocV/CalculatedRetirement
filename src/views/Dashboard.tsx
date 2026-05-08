import { useState, useMemo, useRef, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { toProjectionBuckets } from "../engine/simulator";
import type { YearResult } from "../types";
import { TAX_BRACKETS } from "../constants/taxConstants";
import { palette } from "../constants/palette";

// ============================================================
// Bracket colors by rate
// ============================================================
const BRACKET_COLORS: Record<number, string> = {
  0.10: "#1F6B47",
  0.12: "#2E8B5F",
  0.22: "#C9962E",
  0.24: "#D67124",
  0.32: "#C24A3A",
  0.35: "#A0322A",
  0.37: "#7A1F18",
};

const DISPLAY_CAP = 600_000;

// ============================================================
// Row helper for Year Detail
// ============================================================
interface DetailRowProps {
  label: string;
  value: number;
  labelColor?: string;
  big?: boolean;
  sub?: string;
}

function DetailRow({ label, value, labelColor, big, sub }: DetailRowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "3px 0" }}>
      <span style={{ fontSize: 12, color: labelColor ?? palette.inkSoft }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span
          className="mono"
          style={{ fontSize: big ? 14 : 12, color: labelColor ?? palette.ink, display: "block" }}
        >
          {formatCurrency(value)}
        </span>
        {sub && (
          <span className="mono" style={{ fontSize: 9.5, color: palette.inkSofter, display: "block" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Quick Adjust Popover
// ============================================================
interface SliderPopoverProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

function SliderPopover({ label, value, min, max, step, format, onChange, onClose, anchorRef }: SliderPopoverProps) {
  const rect = anchorRef.current?.getBoundingClientRect();
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={onClose} />
      <div
        style={{
          position: "fixed",
          top: rect ? rect.bottom + 8 : 100,
          left: rect ? rect.left : 100,
          zIndex: 100,
          background: "#0F1C18",
          border: `1px solid ${palette.borderSoft}`,
          borderRadius: 6,
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          padding: "14px 16px",
          minWidth: 220,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: palette.inkSoft, fontWeight: 600 }}>{label}</span>
          <span className="mono" style={{ fontSize: 12, color: palette.good }}>{format(value)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: palette.inkSofter }}>{format(min)}</span>
          <span style={{ fontSize: 10, color: palette.inkSofter }}>{format(max)}</span>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Cash Flow Bars (inline component)
// ============================================================
interface CashFlowBarsProps {
  data: Array<{
    year: number;
    ageA: number;
    wages: number;
    other: number;
    ss: number;
    pension: number;
    w401k: number;
    wRoth: number;
    wTax: number;
    fromCash: number;
    spend: number;
    fedTax: number;
  }>;
  onHover: (ageA: number | null) => void;
  retirementAgeA: number;
}

function CashFlowBars({ data, onHover, retirementAgeA }: CashFlowBarsProps) {
  // Build tick values every 5 years of ageA
  const ages = data.map((d) => d.ageA);
  const minAge = ages[0] ?? 0;
  const maxAge = ages[ages.length - 1] ?? 0;
  const ticks: number[] = [];
  for (let a = Math.ceil(minAge / 5) * 5; a <= maxAge; a += 5) {
    ticks.push(a);
  }

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (e?.activePayload?.[0]) {
        onHover(e.activePayload[0].payload.ageA);
      }
    },
    [onHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const CustomTooltip = (props: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string | number;
  }) => {
    const { active, payload, label } = props;
    if (!active || !payload || payload.length === 0) return null;
    const incomeTotal = payload
      .filter((p) => p.value > 0)
      .reduce((s, p) => s + p.value, 0);
    const expenseTotal = Math.abs(
      payload.filter((p) => p.value < 0).reduce((s, p) => s + p.value, 0)
    );
    return (
      <div
        style={{
          background: "#0F1C18",
          border: `1px solid ${palette.borderSoft}`,
          borderRadius: 4,
          padding: "8px 12px",
          fontSize: 11,
        }}
      >
        <div style={{ color: palette.inkSoft, marginBottom: 4 }}>Age {label}</div>
        <div style={{ color: palette.wages }}>Income: {formatCurrency(incomeTotal, true)}</div>
        <div style={{ color: palette.spend }}>Expenses: {formatCurrency(expenseTotal, true)}</div>
      </div>
    );
  };

  // Find retirement reference line data point
  const retirementData = data.find((d) => d.ageA === retirementAgeA);
  const refYear = retirementData?.ageA;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 16, left: 10, bottom: 10 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        barCategoryGap="20%"
      >
        <CartesianGrid
          strokeDasharray=""
          vertical={false}
          stroke="rgba(255,255,255,0.06)"
        />
        <XAxis
          dataKey="ageA"
          ticks={ticks}
          tick={{ fontSize: 11, fill: palette.inkSofter }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatCurrency(Math.abs(v), true)}
          tick={{ fontSize: 11, fill: palette.inkSofter }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        {refYear !== undefined && (
          <ReferenceLine
            x={refYear}
            stroke={palette.spend}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        )}
        {/* Income stacks */}
        <Bar dataKey="wages" stackId="income" fill={palette.wages} name="Wages" />
        <Bar dataKey="other" stackId="income" fill={palette.other} name="Rental" />
        <Bar dataKey="ss" stackId="income" fill={palette.ss} name="SS" />
        <Bar dataKey="pension" stackId="income" fill={palette.pension} name="Pension" />
        <Bar dataKey="w401k" stackId="income" fill={palette.account401k} name="401(k) w/d" />
        <Bar dataKey="wRoth" stackId="income" fill={palette.accountRoth} name="Roth w/d" />
        <Bar dataKey="wTax" stackId="income" fill={palette.accountTax} name="Taxable w/d" />
        <Bar dataKey="fromCash" stackId="income" fill={palette.accountCash} name="Cash" />
        {/* Expense stacks (negative values) */}
        <Bar dataKey="spend" stackId="expense" fill={palette.spend} name="Spend" />
        <Bar dataKey="fedTax" stackId="expense" fill={palette.tax} name="Fed Tax" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Tax Bracket Bar
// ============================================================
interface TaxBracketBarProps {
  filingStatus: "MFJ" | "SINGLE";
  taxYear: number;
  taxableIncome?: number;
  marginalRate?: number;
  effectiveRate?: number;
  hoverAge: number | null;
}

function TaxBracketBar({
  filingStatus,
  taxYear,
  taxableIncome,
  marginalRate,
  effectiveRate,
  hoverAge,
}: TaxBracketBarProps) {
  const yearKey = taxYear && TAX_BRACKETS[taxYear] ? taxYear : 2026;
  const brackets = TAX_BRACKETS[yearKey][filingStatus];

  // Cap display at DISPLAY_CAP
  const capped = brackets.map((b) => ({
    ...b,
    displayMax: Math.min(b.max === Infinity ? DISPLAY_CAP : b.max, DISPLAY_CAP),
    displayMin: b.min,
  }));

  const totalWidth = DISPLAY_CAP;

  return (
    <div style={{ padding: "16px 20px 14px" }}>
      <div style={{ position: "relative" }}>
        {/* Bar segments */}
        <div style={{ display: "flex", height: 28, borderRadius: 3, overflow: "hidden" }}>
          {capped.map((b, i) => {
            const segWidth = Math.max(0, b.displayMax - b.displayMin);
            const pct = (segWidth / totalWidth) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={i}
                style={{
                  flex: `0 0 ${pct}%`,
                  background: BRACKET_COLORS[b.rate] ?? "#555",
                  position: "relative",
                  borderRight: i < capped.length - 1 ? "1px solid rgba(0,0,0,0.3)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* Income tick */}
        {taxableIncome !== undefined && taxableIncome > 0 && (
          <div
            style={{
              position: "absolute",
              top: -20,
              left: `${Math.min((taxableIncome / totalWidth) * 100, 100)}%`,
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: palette.ink,
                background: "rgba(15,28,24,0.9)",
                border: `1px solid ${palette.borderSoft}`,
                padding: "1px 4px",
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
            >
              {formatCurrency(taxableIncome, true)}
            </div>
            <div
              style={{
                width: 1,
                height: 32,
                background: "rgba(255,255,255,0.8)",
                margin: "0 auto",
              }}
            />
          </div>
        )}
      </div>

      {/* Rate labels below bar */}
      <div style={{ display: "flex", marginTop: 4 }}>
        {capped.map((b, i) => {
          const segWidth = Math.max(0, b.displayMax - b.displayMin);
          const pct = (segWidth / totalWidth) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={i}
              style={{
                flex: `0 0 ${pct}%`,
                fontSize: 9,
                color: palette.inkSofter,
                textAlign: "center",
                overflow: "hidden",
              }}
            >
              {Math.round(b.rate * 100)}%
            </div>
          );
        })}
      </div>

      {/* Marginal / Effective row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 10, color: palette.inkSoft, letterSpacing: "0.1em" }}>
          MARGINAL ·{" "}
          <span className="mono" style={{ color: palette.ink }}>
            {marginalRate !== undefined ? formatPercent(marginalRate) : "—"}
          </span>
        </span>
        <span style={{ fontSize: 10, color: palette.inkSoft, letterSpacing: "0.1em" }}>
          EFFECTIVE ·{" "}
          <span className="mono" style={{ color: palette.ink }}>
            {effectiveRate !== undefined ? formatPercent(effectiveRate) : "—"}
          </span>
        </span>
      </div>

      {hoverAge === null && (
        <div style={{ fontSize: 11, color: palette.inkSofter, marginTop: 4, textAlign: "center" }}>
          Hover the cash flow chart to overlay your taxable income position.
        </div>
      )}
    </div>
  );
}

// ============================================================
// Dashboard
// ============================================================
export default function Dashboard() {
  const { state, simulation, dispatch } = useApp();
  const [hoverAge, setHoverAge] = useState<number | null>(null);
  const [quickAdjustOpen, setQuickAdjustOpen] = useState(true);
  const [openPopover, setOpenPopover] = useState<"return" | "inflation" | "horizon" | null>(null);

  const returnBtnRef = useRef<HTMLButtonElement>(null);
  const inflationBtnRef = useRef<HTMLButtonElement>(null);
  const horizonBtnRef = useRef<HTMLButtonElement>(null);

  const personA = state.persons.find((p) => p.id === "personA");

  // ── Alert conditions
  const firstShortfall = useMemo(
    () => simulation.find((y) => y.hasShortfall),
    [simulation]
  );
  const firstIrmaa = useMemo(
    () => simulation.find((y) => y.irmaaTriggered),
    [simulation]
  );
  const hasRothConv = state.rothConversionPlan.entries.length > 0;

  // Projected RMD at 73 (for no-roth-conversion alert)
  const rmdAt73Year = useMemo(
    () => simulation.find((y) => y.ageA === 73),
    [simulation]
  );
  const projectedRmd73 = rmdAt73Year
    ? Object.values(rmdAt73Year.rmds).reduce((s, v) => s + v, 0)
    : 0;

  // ── KPI values
  const totalToday = useMemo(
    () => state.accounts.reduce((s, a) => s + a.balance, 0),
    [state.accounts]
  );

  const retirementYearResult = useMemo((): YearResult | undefined => {
    if (!personA) return undefined;
    const retireAge = personA.retirementYear - personA.birthYear;
    return simulation.find((y) => y.ageA === retireAge);
  }, [simulation, personA]);

  const annualSpend = useMemo(() => {
    const currentYear = state.settings.currentYear;
    return state.expenses
      .filter((e) => e.startYear <= currentYear && e.endYear >= currentYear)
      .reduce((s, e) => s + e.annualAmount, 0);
  }, [state.expenses, state.settings.currentYear]);

  const lifetimeTax = useMemo(
    () => simulation.reduce((s, y) => s + y.taxResult.totalFederalTax, 0),
    [simulation]
  );

  // ── Chart data
  const chartData = useMemo(() => {
    return simulation.map((yr) => {
      const b = toProjectionBuckets(yr, state.accounts, state.settings);
      return {
        year: yr.year,
        ageA: yr.ageA,
        // net worth stacks
        b401k: b.b401k,
        bTax: b.bTax,
        bRoth: b.bRoth,
        bCash: b.bCash,
        // cash flow income
        wages: b.wages,
        other: b.other,
        ss: b.ss,
        pension: b.pension,
        w401k: b.w401k,
        wRoth: b.wRoth,
        wTax: b.wTax,
        fromCash: b.fromCash,
        // cash flow expenses (negated)
        spend: -b.targetSpend,
        fedTax: -b.fedTax,
      };
    });
  }, [simulation, state.accounts, state.settings]);

  // ── Hovered year detail
  const hoveredYear = useMemo((): YearResult | undefined => {
    if (hoverAge === null) return undefined;
    return simulation.find((y) => y.ageA === hoverAge);
  }, [hoverAge, simulation]);

  const hoveredBuckets = useMemo(() => {
    if (!hoveredYear) return null;
    return toProjectionBuckets(hoveredYear, state.accounts, state.settings);
  }, [hoveredYear, state.accounts, state.settings]);

  // ── Settings derived
  const returnRate = state.settings.returnRateOverride ?? 0.06;
  const inflationRate = state.settings.inflationRate;
  const planningHorizonAge = state.settings.planningHorizonAge;
  const filingStatus = state.settings.filingStatus;
  const taxYear = state.settings.taxYear ?? 2026;

  // ── SS claim age for chips
  const ssA = state.socialSecurity.find((s) => s.personId === "personA");
  const annualSS = ssA
    ? Math.round(
        (ssA.claimAge <= 62 ? ssA.benefitAt62 :
          ssA.claimAge <= 67 ? ssA.benefitAt67 :
          ssA.benefitAt70) * 12 / 1000
      )
    : 0;

  // Retirement year for chip
  const retirementYear = personA?.retirementYear ?? state.settings.currentYear;

  // ── Retirement age for net worth reference line
  const retirementAgeA = personA ? personA.retirementYear - personA.birthYear : 65;

  const handleFilingToggle = () => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        filingStatus: filingStatus === "MFJ" ? "SINGLE" : "MFJ",
      },
    });
  };

  const handleHover = useCallback((age: number | null) => {
    setHoverAge(age);
  }, []);

  const currentAgeA = simulation[0]?.ageA ?? (personA ? state.settings.currentYear - personA.birthYear : 0);

  return (
    <div style={{ padding: "28px 36px", maxWidth: "100%" }}>
      {/* ── 1. Alert Banners ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: firstShortfall || firstIrmaa || !hasRothConv ? 20 : 0 }}>
        {firstShortfall && (
          <div className="alert alert-error">
            ⚠ Income shortfall projected in {firstShortfall.year} (age {firstShortfall.ageA}). Review withdrawal strategy.
          </div>
        )}
        {firstIrmaa && (
          <div className="alert alert-warning">
            Medicare IRMAA surcharge triggered starting {firstIrmaa.year}. Consider Roth conversion timing.
          </div>
        )}
        {!hasRothConv && (
          <div className="alert alert-info">
            No Roth conversion plan configured. At current balances, projected RMD at 73 is{" "}
            <span className="mono">{formatCurrency(projectedRmd73)}</span>.
          </div>
        )}
      </div>

      {/* ── 2. Header Section ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: palette.ink,
              lineHeight: 1.1,
            }}
          >
            Drawdown Atlas
          </h1>
          <p
            style={{
              fontSize: 13,
              color: palette.inkSoft,
              maxWidth: 540,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Year-by-year projection of assets, income, expenses, and taxes. Hover the chart to inspect a year.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
          <button
            className="chip chip-sm"
            onClick={handleFilingToggle}
            title="Click to toggle filing status"
          >
            Filing · {filingStatus === "MFJ" ? "Married/Joint" : "Single"}
          </button>
          <span className="chip chip-sm" style={{ cursor: "default" }}>
            Plan · {currentAgeA} → {planningHorizonAge}
          </span>
        </div>
      </div>

      {/* ── 3. KPI Strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: palette.borderSoft,
          borderRadius: 6,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* Tile 1: Total Today */}
        <div
          className="kpi-tile"
          style={{ cursor: "pointer" }}
          onClick={() => console.log("Total today accounts:", state.accounts)}
        >
          <div className="kpi-edit-hint">EDIT ↗</div>
          <div className="kpi-label">Total Today</div>
          <div className="kpi-value mono">{formatCurrency(totalToday, true)}</div>
          <div className="kpi-sub">Age {currentAgeA} today</div>
        </div>

        {/* Tile 2: At Retirement */}
        <div
          className="kpi-tile"
          style={{ cursor: "pointer" }}
          onClick={() => console.log("Retirement year result:", retirementYearResult)}
        >
          <div className="kpi-edit-hint">EDIT ↗</div>
          <div className="kpi-label">At Retirement</div>
          <div className="kpi-value mono">
            {retirementYearResult
              ? formatCurrency(retirementYearResult.totalAssets, true)
              : "—"}
          </div>
          <div className="kpi-sub">After tax-deferred growth</div>
        </div>

        {/* Tile 3: Annual Spend */}
        <div
          className="kpi-tile"
          style={{ cursor: "pointer" }}
          onClick={() => console.log("Expenses:", state.expenses)}
        >
          <div className="kpi-edit-hint">EDIT ↗</div>
          <div className="kpi-label">Annual Spend</div>
          <div className="kpi-value mono">{formatCurrency(annualSpend, true)}</div>
          <div className="kpi-sub">Today's dollars</div>
        </div>

        {/* Tile 4: Lifetime Tax */}
        <div className="kpi-tile">
          <div className="kpi-label">Lifetime Tax</div>
          <div className="kpi-value mono">{formatCurrency(lifetimeTax, true)}</div>
          <div className="kpi-sub">Federal, lifetime</div>
        </div>
      </div>

      {/* ── 4. Quick Adjust Chips Row ── */}
      <div style={{ marginBottom: 24 }}>
        <div className="card-eyebrow" style={{ marginBottom: 8 }}>⚡ Quick adjust</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Return chip */}
          <button
            ref={returnBtnRef}
            className="chip chip-sm"
            onClick={() => setOpenPopover(openPopover === "return" ? null : "return")}
          >
            Return · {(returnRate * 100).toFixed(0)}%
          </button>
          {openPopover === "return" && (
            <SliderPopover
              label="Investment Return Rate"
              value={returnRate * 100}
              min={1}
              max={12}
              step={0.5}
              format={(v) => `${v.toFixed(1)}%`}
              onChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { returnRateOverride: v / 100 } })
              }
              onClose={() => setOpenPopover(null)}
              anchorRef={returnBtnRef}
            />
          )}

          {/* Inflation chip */}
          <button
            ref={inflationBtnRef}
            className="chip chip-sm"
            onClick={() => setOpenPopover(openPopover === "inflation" ? null : "inflation")}
          >
            Inflation · {(inflationRate * 100).toFixed(0)}%
          </button>
          {openPopover === "inflation" && (
            <SliderPopover
              label="Inflation Rate"
              value={inflationRate * 100}
              min={0}
              max={8}
              step={0.25}
              format={(v) => `${v.toFixed(1)}%`}
              onChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { inflationRate: v / 100 } })
              }
              onClose={() => setOpenPopover(null)}
              anchorRef={inflationBtnRef}
            />
          )}

          {/* Horizon chip */}
          <button
            ref={horizonBtnRef}
            className="chip chip-sm"
            onClick={() => setOpenPopover(openPopover === "horizon" ? null : "horizon")}
          >
            Horizon · {planningHorizonAge}
          </button>
          {openPopover === "horizon" && (
            <SliderPopover
              label="Planning Horizon (Age)"
              value={planningHorizonAge}
              min={75}
              max={100}
              step={1}
              format={(v) => `Age ${v}`}
              onChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { planningHorizonAge: v } })
              }
              onClose={() => setOpenPopover(null)}
              anchorRef={horizonBtnRef}
            />
          )}

          {/* Toggle for expand/collapse (not used for chart hide, just visual) */}
          <button
            className="chip chip-sm"
            style={{ marginLeft: "auto" }}
            onClick={() => setQuickAdjustOpen((o) => !o)}
          >
            {quickAdjustOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
      </div>

      {/* ── 5. Hero Card: Cash Flow ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-eyebrow">INCOME · EXPENSES · TAXES</div>
        <div className="card-title" style={{ marginBottom: 12 }}>Cash Flow</div>

        {/* Summary chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <span className="chip chip-sm">Retire · {retirementYear}</span>
          <span className="chip chip-sm">
            SS · ${annualSS}k @ {ssA?.claimAge ?? 67}
          </span>
          <span className="chip chip-sm">Return · {(returnRate * 100).toFixed(0)}%</span>
        </div>

        {chartData.length > 0 ? (
          <CashFlowBars
            data={chartData}
            onHover={handleHover}
            retirementAgeA={retirementAgeA}
          />
        ) : (
          <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: palette.inkSoft }}>
            No simulation data
          </div>
        )}
      </div>

      {/* ── 6. Two-Column Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: 20, marginBottom: 20 }}>
        {/* Net Worth card */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Net Worth Over Time</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                stackOffset="none"
              >
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: palette.inkSofter }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v, true)}
                  tick={{ fontSize: 11, fill: palette.inkSofter }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0F1C18",
                    border: `1px solid ${palette.borderSoft}`,
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                  formatter={(v) => formatCurrency(Number(v ?? 0), true)}
                />
                <ReferenceLine
                  x={retirementYear}
                  stroke={palette.spend}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="b401k"
                  stackId="nw"
                  stroke={palette.account401k}
                  fill={palette.account401k}
                  fillOpacity={0.85}
                  name="401(k)/IRA"
                />
                <Area
                  type="monotone"
                  dataKey="bTax"
                  stackId="nw"
                  stroke={palette.accountTax}
                  fill={palette.accountTax}
                  fillOpacity={0.85}
                  name="Taxable"
                />
                <Area
                  type="monotone"
                  dataKey="bRoth"
                  stackId="nw"
                  stroke={palette.accountRoth}
                  fill={palette.accountRoth}
                  fillOpacity={0.85}
                  name="Roth"
                />
                <Area
                  type="monotone"
                  dataKey="bCash"
                  stackId="nw"
                  stroke={palette.accountCash}
                  fill={palette.accountCash}
                  fillOpacity={0.85}
                  name="Cash"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: palette.inkSoft }}>
              No simulation data
            </div>
          )}
        </div>

        {/* Year Detail card */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            {hoverAge !== null ? `Age ${hoverAge} · ${hoveredYear?.year ?? ""}` : "Hover the Chart"}
          </div>

          {hoverAge === null || !hoveredYear || !hoveredBuckets ? (
            <div style={{ color: palette.inkSoft, fontSize: 12, marginTop: 8 }}>
              Hover the cash flow chart to inspect a year.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* INCOME section */}
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: palette.wages, marginBottom: 4, marginTop: 4 }}>
                INCOME
              </div>
              <DetailRow label="Wages" value={hoveredBuckets.wages} labelColor={palette.wages} />
              <DetailRow label="Social Security" value={hoveredBuckets.ss} labelColor={palette.ss} />
              {hoveredBuckets.pension > 0 && (
                <DetailRow label="Pension" value={hoveredBuckets.pension} labelColor={palette.pension} />
              )}
              <DetailRow
                label="401(k) w/d"
                value={hoveredBuckets.w401k}
                sub={hoveredBuckets.rmd > 0 ? `RMD: ${formatCurrency(hoveredBuckets.rmd)}` : undefined}
              />
              {hoveredBuckets.wRoth > 0 && (
                <DetailRow label="Roth w/d" value={hoveredBuckets.wRoth} />
              )}
              {hoveredBuckets.wTax > 0 && (
                <DetailRow label="Taxable w/d" value={hoveredBuckets.wTax} />
              )}

              {/* EXPENSES section */}
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: palette.spend, marginBottom: 4, marginTop: 10 }}>
                EXPENSES
              </div>
              <DetailRow label="Target Spend" value={hoveredBuckets.targetSpend} labelColor={palette.spend} />
              {hoveredBuckets.rothConv > 0 && (
                <DetailRow label="Roth Conversion" value={hoveredBuckets.rothConv} labelColor={palette.accountTax} />
              )}
              <DetailRow
                label="Federal Tax"
                value={hoveredBuckets.fedTax}
                labelColor={palette.tax}
                sub={`marginal ${formatPercent(hoveredBuckets.marginal)}`}
              />

              {/* SUMMARY */}
              <div style={{ borderTop: `1px solid ${palette.borderSoft}`, marginTop: 10, paddingTop: 8 }}>
                <DetailRow
                  label="Net Spendable"
                  value={hoveredBuckets.netSpend}
                  labelColor={palette.good}
                  big
                />
                <DetailRow
                  label="Ending Balance"
                  value={hoveredYear.totalAssets}
                  labelColor={palette.account401k}
                  big
                />
                {hoveredBuckets.shortfall > 0 && (
                  <DetailRow
                    label="⚠ Shortfall"
                    value={hoveredBuckets.shortfall}
                    labelColor={palette.danger}
                    big
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 7. Tax Bracket Bar ── */}
      <div className="card">
        <div style={{ padding: "0 0 8px" }}>
          <div className="card-eyebrow">TAX POSITION</div>
          <div className="card-title">
            {hoverAge !== null ? `Tax Brackets · Age ${hoverAge}` : "Tax Brackets"}
          </div>
        </div>
        <TaxBracketBar
          filingStatus={filingStatus}
          taxYear={taxYear}
          taxableIncome={hoveredBuckets?.taxableIncome}
          marginalRate={hoveredBuckets?.marginal}
          effectiveRate={hoveredYear?.taxResult.effectiveRate}
          hoverAge={hoverAge}
        />
      </div>

      {/* Bottom spacer */}
      <div style={{ height: 40 }} />

      {/* Spacer */}
    </div>
  );
}
