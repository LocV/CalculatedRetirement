import { useState } from "react";
import { Trash2, Upload, Save, BarChart3, Info } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { SavedScenario, YearResult } from "../types";
import { formatCurrency, cn } from "../utils/formatters";

// ─── Key Metrics Helper ───────────────────────────────────────────────────────

interface ScenarioMetrics {
  netWorthAt70: number;
  netWorthAt80: number;
  lifetimeTax: number;
  firstShortfallYear: number | null;
  totalRothConverted: number;
  estateAt90: number;
}

function calcMetrics(
  scenarioState: SavedScenario["state"] | null,
  simulation: YearResult[]
): ScenarioMetrics {
  // Use provided simulation results or fall back to live simulation
  const sim = simulation;

  const personA = scenarioState?.persons?.find((p) => p.id === "personA");
  const birthYear = personA?.birthYear ?? 1975;

  function simAtAge(age: number) {
    return sim.find((yr) => yr.year === birthYear + age);
  }

  const at70 = simAtAge(70);
  const at80 = simAtAge(80);
  const at90 = simAtAge(90);

  const lifetimeTax = sim.reduce((sum, yr) => sum + yr.taxResult.totalFederalTax, 0);
  const totalRothConverted = sim.reduce(
    (sum, yr) => sum + Object.values(yr.rothConversions).reduce((s, v) => s + v, 0),
    0
  );
  const shortfallYear = sim.find((yr) => yr.hasShortfall);

  return {
    netWorthAt70: at70?.totalAssets ?? 0,
    netWorthAt80: at80?.totalAssets ?? 0,
    lifetimeTax,
    firstShortfallYear: shortfallYear?.year ?? null,
    totalRothConverted,
    estateAt90: at90?.estateValue ?? 0,
  };
}

// ─── Scenario Card ────────────────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: SavedScenario;
  isActive: boolean;
  isSelected: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}

function ScenarioCard({
  scenario,
  isActive,
  isSelected,
  onLoad,
  onDelete,
  onToggleSelect,
}: ScenarioCardProps) {
  const { simulation } = useApp();
  const metrics = calcMetrics(scenario.state, simulation);
  const savedDate = new Date(scenario.savedAt).toLocaleDateString();

  return (
    <div
      className={cn(
        "bg-white rounded-xl border shadow-sm p-5 space-y-3 transition-all",
        isActive ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20" : "border-slate-200",
        isSelected ? "ring-2 ring-[#4A6FA5]" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 accent-[#1B3A6B]"
          />
          <div>
            <div className="font-semibold text-slate-800">{scenario.name}</div>
            <div className="text-xs text-slate-400">Saved {savedDate}</div>
          </div>
        </div>
        {isActive && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1B3A6B] text-white font-medium flex-shrink-0">
            Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-slate-500">Net Worth at 70</div>
          <div className="font-semibold text-slate-700">{formatCurrency(metrics.netWorthAt70)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-slate-500">Net Worth at 80</div>
          <div className="font-semibold text-slate-700">{formatCurrency(metrics.netWorthAt80)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-slate-500">Lifetime Tax</div>
          <div className="font-semibold text-red-600">{formatCurrency(metrics.lifetimeTax)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-slate-500">First Shortfall</div>
          <div className={cn("font-semibold", metrics.firstShortfallYear ? "text-red-600" : "text-green-600")}>
            {metrics.firstShortfallYear ?? "None"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onLoad}
          className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5] transition-colors"
        >
          <Upload className="w-3.5 h-3.5 inline mr-1" />
          Load
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Compare Table ────────────────────────────────────────────────────────────

interface CompareTableProps {
  scenarios: SavedScenario[];
  simulation: YearResult[];
}

function CompareTable({ scenarios, simulation }: CompareTableProps) {
  const rows: Array<{ label: string; key: keyof ScenarioMetrics }> = [
    { label: "Net Worth at 70", key: "netWorthAt70" },
    { label: "Net Worth at 80", key: "netWorthAt80" },
    { label: "Lifetime Tax Paid", key: "lifetimeTax" },
    { label: "First Shortfall Year", key: "firstShortfallYear" },
    { label: "Total Roth Converted", key: "totalRothConverted" },
    { label: "Estate at 90", key: "estateAt90" },
  ];

  const allMetrics = scenarios.map((s) => calcMetrics(s.state, simulation));

  function formatMetric(val: number | null, key: keyof ScenarioMetrics): string {
    if (val === null) return "None";
    if (key === "firstShortfallYear") return val === 0 ? "None" : String(val);
    if (typeof val === "number") return formatCurrency(val);
    return String(val);
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 w-48">Metric</th>
            {scenarios.map((s) => (
              <th key={s.id} className="px-4 py-3 text-right font-semibold text-[#1B3A6B]">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-slate-100 bg-white hover:bg-slate-50">
              <td className="px-4 py-2.5 font-medium text-slate-600">{row.label}</td>
              {allMetrics.map((m, i) => {
                const val = m[row.key] as number | null;
                return (
                  <td key={i} className={cn(
                    "px-4 py-2.5 text-right",
                    row.key === "firstShortfallYear" && val !== null && val > 0
                      ? "text-red-600 font-medium"
                      : row.key === "lifetimeTax"
                      ? "text-red-600"
                      : "text-slate-700"
                  )}>
                    {formatMetric(val, row.key)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Save Dialog ──────────────────────────────────────────────────────────────

function SaveDialog({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80">
        <h3 className="text-lg font-semibold text-[#1B3A6B] mb-4">Save Current Scenario</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scenario name..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5] disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Scenarios() {
  const { state, simulation, dispatch } = useApp();
  const { scenarios, activeScenarioId } = state;

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function saveScenario(name: string) {
    dispatch({ type: "SAVE_SCENARIO", payload: { name } });
    setShowSaveDialog(false);
  }

  function loadScenario(id: string) {
    dispatch({ type: "LOAD_SCENARIO", payload: id });
    setConfirmLoad(null);
  }

  function deleteScenario(id: string) {
    dispatch({ type: "DELETE_SCENARIO", payload: id });
    setConfirmDelete(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  const selectedScenarios = scenarios.filter((s) => selectedIds.has(s.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1B3A6B]">Scenarios</h2>
          <p className="text-slate-500 mt-1">Save, compare, and restore planning scenarios.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setShowCompare(!showCompare)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors",
                showCompare
                  ? "bg-[#4A6FA5] text-white border-[#4A6FA5]"
                  : "border-[#1B3A6B] text-[#1B3A6B] hover:bg-[#1B3A6B]/5"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Compare ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={scenarios.length >= 5}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5] disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Current
          </button>
        </div>
      </div>

      {/* Pre-loaded scenarios note */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-[#4A6FA5] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#1B3A6B]">
          <strong>Pre-configured scenarios:</strong> 3 pre-built scenarios are available in the default data
          (baseline, aggressive Roth conversion, conservative). Load them to explore different strategies.
        </div>
      </div>

      {/* Scenario cards */}
      {scenarios.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Save className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-base">No saved scenarios yet.</p>
          <p className="text-sm mt-1">Click "Save Current" to capture your current plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isActive={scenario.id === activeScenarioId}
              isSelected={selectedIds.has(scenario.id)}
              onLoad={() => {
                if (activeScenarioId) {
                  setConfirmLoad(scenario.id);
                } else {
                  loadScenario(scenario.id);
                }
              }}
              onDelete={() => setConfirmDelete(scenario.id)}
              onToggleSelect={() => toggleSelect(scenario.id)}
            />
          ))}
        </div>
      )}

      {/* Compare table */}
      {showCompare && selectedScenarios.length >= 2 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[#1B3A6B]">Scenario Comparison</h3>
          <CompareTable scenarios={selectedScenarios} simulation={simulation} />
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <SaveDialog onSave={saveScenario} onClose={() => setShowSaveDialog(false)} />
      )}

      {/* Confirm load dialog */}
      {confirmLoad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-[#1B3A6B] mb-2">Load Scenario?</h3>
            <p className="text-sm text-slate-600 mb-4">
              This will overwrite your current unsaved state. Are you sure?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmLoad(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => loadScenario(confirmLoad)} className="px-4 py-2 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5]">
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-[#1B3A6B] mb-2">Delete Scenario?</h3>
            <p className="text-sm text-slate-600 mb-4">
              "{scenarios.find((s) => s.id === confirmDelete)?.name}" will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => deleteScenario(confirmDelete)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
