import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatPercent, cn } from "../utils/formatters";
import type { IncomeSource, SocialSecurity, Expense } from "../types";
import { IRMAA_TIERS } from "../constants/taxConstants";

// ============================================================
// Helpers
// ============================================================

type TabId = "income" | "ss" | "expenses";

function newIncomeSource(): IncomeSource {
  return {
    id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    owner: "personA",
    type: "W2",
    name: "",
    annualGrossAmount: 0,
    startYear: new Date().getFullYear(),
    endYear: 9999,
    inflationAdjusted: false,
    rentalExpenses: null,
  };
}

function newExpense(): Expense {
  return {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    annualAmount: 0,
    startYear: new Date().getFullYear(),
    endYear: 9999,
    inflationAdjusted: true,
    type: "LIVING",
  };
}

function incomeTypeBadge(type: IncomeSource["type"]): string {
  switch (type) {
    case "W2":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "RENTAL":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "PENSION":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "OTHER":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function expenseTypeBadge(type: Expense["type"]): string {
  switch (type) {
    case "LIVING":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "MORTGAGE":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "HEALTH_INSURANCE":
      return "bg-green-100 text-green-700 border-green-200";
    case "MEDICARE":
      return "bg-teal-100 text-teal-700 border-teal-200";
    case "OTHER":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function expenseTypeLabel(type: Expense["type"]): string {
  switch (type) {
    case "LIVING": return "Living";
    case "MORTGAGE": return "Mortgage";
    case "HEALTH_INSURANCE": return "Health Insurance";
    case "MEDICARE": return "Medicare";
    case "OTHER": return "Other";
    default: return type;
  }
}

function incomeTypeLabel(type: IncomeSource["type"]): string {
  switch (type) {
    case "W2": return "W-2";
    case "RENTAL": return "Rental";
    case "PENSION": return "Pension";
    case "OTHER": return "Other";
    default: return type;
  }
}

function getIrmaaTier(magi: number) {
  return IRMAA_TIERS.find((t) => magi >= t.magiMin && magi <= t.magiMax) ?? IRMAA_TIERS[0];
}

// ============================================================
// Income Source Side Panel
// ============================================================
interface IncomePanelProps {
  source: IncomeSource;
  personAName: string;
  personBName: string;
  onSave: (s: IncomeSource) => void;
  onClose: () => void;
}

function IncomePanel({ source, personAName, personBName, onSave, onClose }: IncomePanelProps) {
  const [form, setForm] = useState<IncomeSource>({ ...source });

  function set<K extends keyof IncomeSource>(key: K, value: IncomeSource[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isRental = form.type === "RENTAL";

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {source.name ? "Edit Income Source" : "Add Income Source"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Bob's W-2"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
            <select
              value={form.owner}
              onChange={(e) => set("owner", e.target.value as IncomeSource["owner"])}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            >
              <option value="personA">{personAName}</option>
              <option value="personB">{personBName}</option>
              <option value="joint">Joint</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => {
                const t = e.target.value as IncomeSource["type"];
                setForm((f) => ({
                  ...f,
                  type: t,
                  rentalExpenses:
                    t === "RENTAL"
                      ? f.rentalExpenses ?? {
                          propertyTax: 0,
                          insurance: 0,
                          maintenance: 0,
                          vacancyRate: 0,
                          propertyValue: 0,
                          landValuePct: 0.2,
                          propertyAppreciationRate: 0.03,
                        }
                      : null,
                }));
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            >
              <option value="W2">W-2</option>
              <option value="RENTAL">Rental</option>
              <option value="PENSION">Pension</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Annual Gross Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={form.annualGrossAmount}
                onChange={(e) => set("annualGrossAmount", parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Year</label>
              <input
                type="number"
                value={form.startYear}
                onChange={(e) => set("startYear", parseInt(e.target.value) || 2026)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Year</label>
              <input
                type="number"
                value={form.endYear === 9999 ? "" : form.endYear}
                placeholder="9999 = forever"
                onChange={(e) => set("endYear", parseInt(e.target.value) || 9999)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.inflationAdjusted}
              onChange={(e) => set("inflationAdjusted", e.target.checked)}
              className="accent-[#4A6FA5] w-4 h-4"
            />
            <span className="text-sm text-slate-700">Inflation Adjusted</span>
          </label>

          {/* Rental Expenses */}
          {isRental && form.rentalExpenses && (
            <div className="space-y-3 bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Rental Expense Details</h4>
              {[
                { key: "propertyTax" as const, label: "Property Tax ($/yr)" },
                { key: "insurance" as const, label: "Insurance ($/yr)" },
                { key: "maintenance" as const, label: "Maintenance ($/yr)" },
                { key: "propertyValue" as const, label: "Property Value ($)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      value={form.rentalExpenses![key] as number}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          rentalExpenses: { ...f.rentalExpenses!, [key]: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                    />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vacancy Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={(form.rentalExpenses.vacancyRate * 100).toFixed(1)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rentalExpenses: { ...f.rentalExpenses!, vacancyRate: parseFloat(e.target.value) / 100 || 0 },
                      }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Land Value %</label>
                <div className="relative">
                  <input
                    type="number"
                    step={1}
                    value={(form.rentalExpenses.landValuePct * 100).toFixed(0)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rentalExpenses: { ...f.rentalExpenses!, landValuePct: parseFloat(e.target.value) / 100 || 0 },
                      }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Appreciation Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={(form.rentalExpenses.propertyAppreciationRate * 100).toFixed(1)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rentalExpenses: {
                          ...f.rentalExpenses!,
                          propertyAppreciationRate: parseFloat(e.target.value) / 100 || 0,
                        },
                      }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#4A6FA5] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Income Sources Tab
// ============================================================
interface IncomeSourcesTabProps {
  personAName: string;
  personBName: string;
}

function IncomeSourcesTab({ personAName, personBName }: IncomeSourcesTabProps) {
  const { state, dispatch } = useApp();
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [expandedRental, setExpandedRental] = useState<string | null>(null);

  function ownerLabel(owner: IncomeSource["owner"]): string {
    if (owner === "personA") return personAName;
    if (owner === "personB") return personBName;
    return "Joint";
  }

  function handleSave(source: IncomeSource) {
    const exists = state.incomeSources.some((s) => s.id === source.id);
    if (exists) {
      dispatch({ type: "UPDATE_INCOME_SOURCE", payload: source });
    } else {
      dispatch({ type: "ADD_INCOME_SOURCE", payload: source });
    }
    setEditingSource(null);
  }

  function handleDelete(id: string) {
    if (window.confirm("Delete this income source?")) {
      dispatch({ type: "DELETE_INCOME_SOURCE", payload: id });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {state.incomeSources.length} Income Source{state.incomeSources.length !== 1 ? "s" : ""}
        </h3>
        <button
          onClick={() => setEditingSource(newIncomeSource())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#4A6FA5] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Income
        </button>
      </div>

      <div className="space-y-2">
        {state.incomeSources.map((src) => {
          const isRental = src.type === "RENTAL";
          const isExpanded = expandedRental === src.id;
          const re = src.rentalExpenses;
          const netRentalIncome = re
            ? src.annualGrossAmount * (1 - re.vacancyRate) - re.propertyTax - re.insurance - re.maintenance
            : 0;
          const depreciation = re
            ? ((re.propertyValue * (1 - re.landValuePct)) / 27.5)
            : 0;

          return (
            <div key={src.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                {isRental && (
                  <button
                    onClick={() => setExpandedRental(isExpanded ? null : src.id)}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                {!isRental && <div className="w-4 flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800">{src.name || "Unnamed"}</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", incomeTypeBadge(src.type))}>
                      {incomeTypeLabel(src.type)}
                    </span>
                    {src.inflationAdjusted && (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Inflation adj.</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ownerLabel(src.owner)} · {src.startYear}–{src.endYear === 9999 ? "∞" : src.endYear}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-slate-800">{formatCurrency(src.annualGrossAmount)}</div>
                  <div className="text-xs text-slate-400">gross/yr</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingSource({ ...src })}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(src.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isRental && isExpanded && re && (
                <div className="border-t border-slate-100 px-6 py-4 bg-amber-50">
                  <h4 className="text-xs font-semibold text-amber-800 mb-3 uppercase tracking-wide">Rental Expense Breakdown</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500 text-xs">Property Tax</div>
                      <div className="font-medium">{formatCurrency(re.propertyTax)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Insurance</div>
                      <div className="font-medium">{formatCurrency(re.insurance)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Maintenance</div>
                      <div className="font-medium">{formatCurrency(re.maintenance)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Vacancy Rate</div>
                      <div className="font-medium">{formatPercent(re.vacancyRate)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Net Income</div>
                      <div className={cn("font-semibold", netRentalIncome >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(netRentalIncome)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Depreciation</div>
                      <div className="font-medium text-blue-600">{formatCurrency(depreciation)}/yr</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {state.incomeSources.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            No income sources yet. Click "Add Income" to get started.
          </div>
        )}
      </div>

      {editingSource && (
        <IncomePanel
          source={editingSource}
          personAName={personAName}
          personBName={personBName}
          onSave={handleSave}
          onClose={() => setEditingSource(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Social Security Tab
// ============================================================
interface SSTabProps {
  personAName: string;
  personBName: string;
}

function SSTab({ personAName, personBName }: SSTabProps) {
  const { state, dispatch } = useApp();

  const ssA = state.socialSecurity[0];
  const ssB = state.socialSecurity[1];
  const personA = state.persons[0];
  const personB = state.persons[1];

  function updateSS(updated: SocialSecurity) {
    dispatch({ type: "UPDATE_SS", payload: updated });
  }

  function computeBenefit(ss: SocialSecurity): number {
    const age = ss.claimAge;
    if (age <= 62) return ss.benefitAt62;
    if (age >= 70) return ss.benefitAt70;
    if (age <= 67) {
      const frac = (age - 62) / (67 - 62);
      return ss.benefitAt62 + frac * (ss.benefitAt67 - ss.benefitAt62);
    }
    const frac = (age - 67) / (70 - 67);
    return ss.benefitAt67 + frac * (ss.benefitAt70 - ss.benefitAt67);
  }

  const monthlyA = ssA ? computeBenefit(ssA) : 0;
  const monthlyB = ssB ? computeBenefit(ssB) : 0;

  // Check if retirement year < SS claim year
  const retA = personA?.retirementYear ?? 0;
  const retB = personB?.retirementYear ?? 0;
  const claimYearA = ssA && personA ? personA.birthYear + ssA.claimAge : 0;
  const claimYearB = ssB && personB ? personB.birthYear + ssB.claimAge : 0;

  const spousalBenefit = ssA ? ssA.benefitAt67 * 0.5 : 0;

  interface SSPersonCardProps {
    ss: SocialSecurity;
    personName: string;
    retirementYear: number;
    claimYear: number;
    monthlyBenefit: number;
    isSpousal?: boolean;
  }

  function SSPersonCard({ ss, personName, retirementYear, claimYear, monthlyBenefit, isSpousal = false }: SSPersonCardProps) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
        <h3 className="font-bold text-[#1B3A6B] text-base">{personName}</h3>

        {retirementYear > claimYear && (
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Retirement year ({retirementYear}) is after SS claim year ({claimYear}). SS benefits won't be received until {claimYear}.
          </div>
        )}

        {/* Benefit at key ages */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "At 62 (monthly)", key: "benefitAt62" as const },
            { label: "At 67/FRA (monthly)", key: "benefitAt67" as const },
            { label: "At 70 (monthly)", key: "benefitAt70" as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  value={ss[key]}
                  onChange={(e) => updateSS({ ...ss, [key]: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Claim Age Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-slate-700">Claim Age</label>
            <span className="text-sm font-bold text-[#1B3A6B]">{ss.claimAge}</span>
          </div>
          <input
            type="range"
            min={62}
            max={70}
            step={1}
            value={ss.claimAge}
            onChange={(e) => updateSS({ ...ss, claimAge: parseInt(e.target.value) })}
            className="w-full accent-[#4A6FA5]"
          />
          <div className="flex justify-between text-xs text-slate-400">
            {[62, 63, 64, 65, 66, 67, 68, 69, 70].map((age) => (
              <span key={age}>{age}</span>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-[#1B3A6B]/5 rounded-lg px-4 py-3 text-sm">
          <span className="text-slate-600">At age </span>
          <span className="font-bold text-[#1B3A6B]">{ss.claimAge}</span>
          <span className="text-slate-600">, monthly benefit = </span>
          <span className="font-bold text-green-600">{formatCurrency(monthlyBenefit)}</span>
          <span className="text-slate-600"> | Annual = </span>
          <span className="font-bold text-green-600">{formatCurrency(monthlyBenefit * 12)}</span>
        </div>

        {/* Early retirement reduction */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-slate-700">Early Retirement SS Reduction</label>
            <span className="text-sm font-bold text-[#1B3A6B]">{ss.earlyRetirementReductionPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={ss.earlyRetirementReductionPct}
            onChange={(e) => updateSS({ ...ss, earlyRetirementReductionPct: parseFloat(e.target.value) })}
            className="w-full accent-[#4A6FA5]"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0%</span><span>20%</span>
          </div>
        </div>

        {/* Spousal benefit section (Person B only) */}
        {isSpousal && ssA && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Spousal Benefit</h4>
            <div className="text-sm text-slate-700">
              <span className="text-slate-500">Own benefit at 67: </span>
              <span className="font-semibold">{formatCurrency(ss.benefitAt67)}/mo</span>
            </div>
            <div className="text-sm text-slate-700">
              <span className="text-slate-500">Spousal benefit at 67: </span>
              <span className="font-semibold">{formatCurrency(spousalBenefit)}/mo</span>
              <span className="text-slate-400 text-xs"> (50% of {personAName}'s FRA)</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Info className="w-4 h-4" />
              Recommended: {ss.benefitAt67 >= spousalBenefit ? "Own benefit" : "Spousal benefit"} (${formatCurrency(Math.max(ss.benefitAt67, spousalBenefit))}/mo)
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {ssA && personA && (
        <SSPersonCard
          ss={ssA}
          personName={personAName}
          retirementYear={retA}
          claimYear={claimYearA}
          monthlyBenefit={monthlyA}
        />
      )}
      {ssB && personB && (
        <SSPersonCard
          ss={ssB}
          personName={personBName}
          retirementYear={retB}
          claimYear={claimYearB}
          monthlyBenefit={monthlyB}
          isSpousal
        />
      )}
    </div>
  );
}

// ============================================================
// Expense Side Panel
// ============================================================
interface ExpensePanelProps {
  expense: Expense;
  onSave: (e: Expense) => void;
  onClose: () => void;
}

function ExpensePanel({ expense, onSave, onClose }: ExpensePanelProps) {
  const [form, setForm] = useState<Expense>({ ...expense });

  function set<K extends keyof Expense>(key: K, value: Expense[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {expense.name ? "Edit Expense" : "Add Expense"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Living Expenses"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Annual Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={form.annualAmount}
                onChange={(e) => set("annualAmount", parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as Expense["type"])}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            >
              <option value="LIVING">Living</option>
              <option value="MORTGAGE">Mortgage</option>
              <option value="HEALTH_INSURANCE">Health Insurance</option>
              <option value="MEDICARE">Medicare</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Year</label>
              <input
                type="number"
                value={form.startYear}
                onChange={(e) => set("startYear", parseInt(e.target.value) || 2026)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Year</label>
              <input
                type="number"
                value={form.endYear === 9999 ? "" : form.endYear}
                placeholder="9999 = forever"
                onChange={(e) => set("endYear", parseInt(e.target.value) || 9999)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.inflationAdjusted}
              onChange={(e) => set("inflationAdjusted", e.target.checked)}
              className="accent-[#4A6FA5] w-4 h-4"
            />
            <span className="text-sm text-slate-700">Inflation Adjusted</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#4A6FA5] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Expenses Tab
// ============================================================
function ExpensesTab() {
  const { state, simulation, dispatch } = useApp();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const firstYearMagi = useMemo(() => {
    return simulation[0]?.taxResult.magi ?? 0;
  }, [simulation]);

  const irmaaTier = useMemo(() => getIrmaaTier(firstYearMagi), [firstYearMagi]);

  function handleSave(expense: Expense) {
    const exists = state.expenses.some((e) => e.id === expense.id);
    if (exists) {
      dispatch({ type: "UPDATE_EXPENSE", payload: expense });
    } else {
      dispatch({ type: "ADD_EXPENSE", payload: expense });
    }
    setEditingExpense(null);
  }

  function handleDelete(id: string) {
    if (window.confirm("Delete this expense?")) {
      dispatch({ type: "DELETE_EXPENSE", payload: id });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {state.expenses.length} Expense{state.expenses.length !== 1 ? "s" : ""}
        </h3>
        <button
          onClick={() => setEditingExpense(newExpense())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#4A6FA5] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      <div className="space-y-2">
        {state.expenses.map((exp) => (
          <div
            key={exp.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-800">{exp.name || "Unnamed"}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", expenseTypeBadge(exp.type))}>
                  {expenseTypeLabel(exp.type)}
                </span>
                {exp.inflationAdjusted && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Inflation adj.</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {exp.startYear}–{exp.endYear === 9999 ? "∞" : exp.endYear}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-slate-800">{formatCurrency(exp.annualAmount)}</div>
              <div className="text-xs text-slate-400">per year</div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingExpense({ ...exp })}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(exp.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {state.expenses.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            No expenses yet. Click "Add Expense" to get started.
          </div>
        )}
      </div>

      {/* IRMAA Calculator */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 mb-3">IRMAA Calculator (Current Year)</h3>
        <div className="text-sm text-slate-600 mb-4">
          Based on first simulation year MAGI:{" "}
          <span className="font-bold text-[#1B3A6B]">{formatCurrency(firstYearMagi)}</span>
        </div>

        {irmaaTier.annualTotal === 0 ? (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
            <Info className="w-4 h-4 flex-shrink-0" />
            No IRMAA surcharge. MAGI is below the {formatCurrency(IRMAA_TIERS[1].magiMin)} threshold.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                IRMAA surcharge applies. MAGI of {formatCurrency(firstYearMagi)} falls in the{" "}
                {formatCurrency(irmaaTier.magiMin)}–{irmaaTier.magiMax === Infinity ? "∞" : formatCurrency(irmaaTier.magiMax)} tier.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Part B Surcharge</div>
                <div className="font-bold text-slate-800">{formatCurrency(irmaaTier.partBMonthly)}/mo</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Part D Surcharge</div>
                <div className="font-bold text-slate-800">{formatCurrency(irmaaTier.partDMonthly)}/mo</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Annual Total</div>
                <div className="font-bold text-red-600">{formatCurrency(irmaaTier.annualTotal)}/yr</div>
              </div>
            </div>
          </div>
        )}

        {/* All IRMAA tiers */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">All IRMAA Tiers (MFJ, 2026)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-2 pr-4 font-medium">MAGI Range</th>
                  <th className="pb-2 pr-4 font-medium">Part B /mo</th>
                  <th className="pb-2 pr-4 font-medium">Part D /mo</th>
                  <th className="pb-2 font-medium">Annual</th>
                </tr>
              </thead>
              <tbody>
                {IRMAA_TIERS.map((tier, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-slate-50",
                      tier === irmaaTier && "bg-yellow-50 font-semibold"
                    )}
                  >
                    <td className="py-1.5 pr-4 text-slate-700">
                      {formatCurrency(tier.magiMin)}–{tier.magiMax === Infinity ? "∞" : formatCurrency(tier.magiMax)}
                    </td>
                    <td className="py-1.5 pr-4 text-slate-700">
                      {tier.partBMonthly === 0 ? "—" : formatCurrency(tier.partBMonthly)}
                    </td>
                    <td className="py-1.5 pr-4 text-slate-700">
                      {tier.partDMonthly === 0 ? "—" : formatCurrency(tier.partDMonthly)}
                    </td>
                    <td className="py-1.5 text-slate-700">
                      {tier.annualTotal === 0 ? "—" : formatCurrency(tier.annualTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingExpense && (
        <ExpensePanel
          expense={editingExpense}
          onSave={handleSave}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Main IncomeExpenses View
// ============================================================
export default function IncomeExpenses() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("income");

  const personA = state.persons[0];
  const personB = state.persons[1];
  const personAName = personA?.name ?? "Person A";
  const personBName = personB?.name ?? "Person B";

  const tabs: { id: TabId; label: string }[] = [
    { id: "income", label: "Income Sources" },
    { id: "ss", label: "Social Security" },
    { id: "expenses", label: "Expenses" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-[#1B3A6B] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "income" && (
        <IncomeSourcesTab personAName={personAName} personBName={personBName} />
      )}
      {activeTab === "ss" && (
        <SSTab personAName={personAName} personBName={personBName} />
      )}
      {activeTab === "expenses" && <ExpensesTab />}
    </div>
  );
}
