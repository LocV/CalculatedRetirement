import { useRef } from "react";
import { Download, Upload, RotateCcw, Printer } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { AppState } from "../types";

// ─── CSV Export Helpers ───────────────────────────────────────────────────────

function exportYearByYearCSV(simulation: ReturnType<typeof useApp>["simulation"]) {
  const headers = ["Year", "Age A", "Age B", "Gross Income", "Federal Tax", "Net Income", "Total Expenses", "Surplus"];
  const rows = simulation.map((yr) => [
    yr.year,
    yr.ageA,
    yr.ageB,
    yr.taxResult.grossIncome,
    yr.taxResult.totalFederalTax,
    yr.netIncome,
    yr.totalExpenses,
    yr.surplus,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "year_by_year_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportTaxCSV(simulation: ReturnType<typeof useApp>["simulation"]) {
  const headers = [
    "Year", "Age A", "Age B", "Gross Income", "Std Deduction", "Taxable Income",
    "Total Fed Tax", "Effective Rate", "Marginal Rate", "MAGI", "IRMAA",
  ];
  const rows = simulation.map((yr) => [
    yr.year,
    yr.ageA,
    yr.ageB,
    yr.taxResult.grossIncome,
    yr.taxResult.standardDeduction,
    yr.taxResult.taxableOrdinaryIncome,
    yr.taxResult.totalFederalTax,
    (yr.taxResult.effectiveRate * 100).toFixed(2) + "%",
    (yr.taxResult.marginalRate * 100).toFixed(0) + "%",
    yr.taxResult.magi,
    yr.irmaaTriggered ? "Yes" : "No",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tax_analysis_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportStateJSON(state: AppState) {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "retirement_state.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h3 className="text-base font-semibold text-[#1B3A6B] border-b border-slate-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
      <div>
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Settings() {
  const { state, simulation, dispatch } = useApp();
  const { settings } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
    dispatch({ type: "UPDATE_SETTINGS", payload: { [key]: value } });
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as AppState;
        dispatch({ type: "LOAD_STATE", payload: parsed });
      } catch {
        alert("Invalid JSON file. Could not import state.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = "";
  }

  function handleReset() {
    if (window.confirm("Reset all data to defaults? This cannot be undone.")) {
      dispatch({ type: "RESET_TO_DEFAULT" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B3A6B]">Settings</h2>
        <p className="text-slate-500 mt-1">Configure simulation assumptions and manage your data.</p>
      </div>

      {/* Simulation Assumptions */}
      <Section title="Simulation Assumptions">
        <Field label="Inflation Rate" note="Applied to inflation-adjusted expenses and income">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={(settings.inflationRate * 100).toFixed(1)}
              onChange={(e) => update("inflationRate", Number(e.target.value) / 100)}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </Field>

        <Field label="Planning Horizon Age" note="Age at which simulation ends (75–100)">
          <input
            type="number"
            min={75}
            max={100}
            value={settings.planningHorizonAge}
            onChange={(e) => update("planningHorizonAge", Number(e.target.value))}
            className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Filing Status">
          <select
            value={settings.filingStatus}
            onChange={(e) => update("filingStatus", e.target.value as "MFJ" | "SINGLE")}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48"
          >
            <option value="MFJ">Married Filing Jointly (MFJ)</option>
            <option value="SINGLE">Single</option>
          </select>
        </Field>

        <Field label="State" note="Washington State — no income tax">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.state}
              readOnly
              className="w-24 border border-slate-100 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <span className="text-xs text-slate-400">No state income tax</span>
          </div>
        </Field>

        <Field label="Tax Year" note="Brackets and deductions for selected year">
          <select
            value={settings.taxYear}
            onChange={(e) => update("taxYear", Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-36"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Field>

        <Field label="Return Rate Override" note="null = use per-account rates">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={settings.returnRateOverride != null ? (settings.returnRateOverride * 100).toFixed(1) : ""}
              placeholder="Per-account"
              onChange={(e) => {
                const val = e.target.value;
                update("returnRateOverride", val === "" ? null : Number(val) / 100);
              }}
              className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
            {settings.returnRateOverride != null && (
              <button
                onClick={() => update("returnRateOverride", null)}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Clear
              </button>
            )}
          </div>
        </Field>

        <Field label="Living Expenses Adj." note="+/- percentage adjustment to all living expenses">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={1}
              value={(settings.livingExpensesAdjPct * 100).toFixed(0)}
              onChange={(e) => update("livingExpensesAdjPct", Number(e.target.value) / 100)}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </Field>

        <Field label="Roth Conversion Adj." note="+/- percentage adjustment to all Roth conversions">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={1}
              value={(settings.rothConversionAdjPct * 100).toFixed(0)}
              onChange={(e) => update("rothConversionAdjPct", Number(e.target.value) / 100)}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </Field>
      </Section>

      {/* Export */}
      <Section title="Export">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportYearByYearCSV(simulation)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Year-by-Year CSV
          </button>
          <button
            onClick={() => exportTaxCSV(simulation)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Tax Analysis CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Dashboard
          </button>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportStateJSON(state)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export App State as JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import App State from JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default Data
          </button>
        </div>
        <p className="text-xs text-slate-400">
          App state is automatically saved to localStorage. Use JSON export for backup or sharing.
        </p>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-1 text-sm text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-500">Application</span>
            <span className="font-medium text-slate-700">Calculated Retirement</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Version</span>
            <span className="font-medium text-slate-700">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Built with</span>
            <span className="font-medium text-slate-700">React + TypeScript + Vite</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Charts</span>
            <span className="font-medium text-slate-700">Recharts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Drag &amp; Drop</span>
            <span className="font-medium text-slate-700">@hello-pangea/dnd</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
