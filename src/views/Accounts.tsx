import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatPercent, cn } from "../utils/formatters";
import { AccountType } from "../types";
import type { Account, SEPPConfig } from "../types";
import { RMD_TABLE } from "../constants/taxConstants";

// ============================================================
// Constants / helpers
// ============================================================

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: AccountType.TRADITIONAL_IRA, label: "Traditional IRA" },
  { value: AccountType.ROTH_IRA, label: "Roth IRA" },
  { value: AccountType.TRADITIONAL_401K, label: "401(k) Traditional" },
  { value: AccountType.ROTH_401K, label: "401(k) Roth" },
  { value: AccountType.BROKERAGE, label: "Brokerage" },
  { value: AccountType.HSA, label: "HSA" },
  { value: AccountType.SAVINGS_CASH, label: "Cash / Savings" },
  { value: AccountType.PENSION, label: "Pension" },
];

function accountTypeBadge(type: AccountType): string {
  switch (type) {
    case AccountType.ROTH_IRA:
    case AccountType.ROTH_401K:
      return "bg-green-100 text-green-700 border-green-200";
    case AccountType.TRADITIONAL_IRA:
      return "bg-blue-100 text-blue-700 border-blue-200";
    case AccountType.TRADITIONAL_401K:
      return "bg-[#1B3A6B]/10 text-[#1B3A6B] border-[#1B3A6B]/20";
    case AccountType.BROKERAGE:
      return "bg-purple-100 text-purple-700 border-purple-200";
    case AccountType.HSA:
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case AccountType.SAVINGS_CASH:
      return "bg-slate-100 text-slate-600 border-slate-200";
    case AccountType.PENSION:
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function is401k(type: AccountType): boolean {
  return type === AccountType.TRADITIONAL_401K || type === AccountType.ROTH_401K;
}

function isTraditional(type: AccountType): boolean {
  return (
    type === AccountType.TRADITIONAL_IRA ||
    type === AccountType.TRADITIONAL_401K
  );
}

function newBlankAccount(owner: "personA" | "personB" | "joint"): Account {
  return {
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    owner,
    name: "",
    type: AccountType.TRADITIONAL_IRA,
    balance: 0,
    annualReturnRate: 0.06,
    annualContribution: 0,
    contributionEndYear: new Date().getFullYear() + 10,
    isRuleOf55Eligible: false,
    isCurrentEmployer: false,
    sepp: null,
  };
}

// ============================================================
// SEPP Calculator Modal
// ============================================================
interface SeppModalProps {
  account: Account;
  ownerBirthYear: number;
  currentYear: number;
  onClose: () => void;
}

function SeppModal({ account, ownerBirthYear, currentYear, onClose }: SeppModalProps) {
  const [balance, setBalance] = useState(account.balance);
  const [age, setAge] = useState(currentYear - ownerBirthYear);
  const [afr, setAfr] = useState(4.5); // %

  // RMD Method
  const rmdDivisor = RMD_TABLE[age] ?? RMD_TABLE[73];
  const rmdAmount = balance / rmdDivisor;

  // Amortization Method (simplified: annual payment on fixed rate, 35-year term)
  const term = Math.max(1, 100 - age);
  const r = afr / 100;
  const amortAmount =
    r === 0
      ? balance / term
      : (balance * r) / (1 - Math.pow(1 + r, -term));

  // Annuitization Method (uses mortality factor = present value annuity factor)
  const mortalityFactor = r === 0 ? term : (1 - Math.pow(1 + r, -term)) / r;
  const annuitizationAmount = balance / mortalityFactor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#4A6FA5]" />
            SEPP Calculator — {account.name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Account Balance ($)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 50)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fed Rate (%)</label>
              <input
                type="number"
                step={0.1}
                value={afr}
                onChange={(e) => setAfr(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Annual SEPP Amounts (All 3 IRS Methods)</h3>

            {[
              {
                method: "RMD Method",
                amount: rmdAmount,
                note: `Balance ÷ ${rmdDivisor.toFixed(1)} (life expectancy divisor at age ${age})`,
              },
              {
                method: "Amortization Method",
                amount: amortAmount,
                note: `Fixed annual payment over ${term}-year term at ${afr}% rate`,
              },
              {
                method: "Annuitization Method",
                amount: annuitizationAmount,
                note: `Balance ÷ annuity factor (${mortalityFactor.toFixed(2)}) at ${afr}%`,
              },
            ].map(({ method, amount, note }) => (
              <div key={method} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">{method}</span>
                  <span className="text-lg font-bold text-[#1B3A6B]">{formatCurrency(amount)}/yr</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{note}</p>
                <p className="text-xs text-slate-400 mt-1">Monthly: {formatCurrency(amount / 12)}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
            <strong>Disclaimer:</strong> SEPP (72(t)) calculations are estimates only. Once begun, distributions must
            continue for the longer of 5 years or until age 59½. Modification triggers the 10% early withdrawal
            penalty plus interest retroactively. Consult a tax professional before establishing a SEPP plan.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Account Side Panel
// ============================================================
interface AccountPanelProps {
  account: Account;
  ownerOptions: { value: "personA" | "personB" | "joint"; label: string }[];
  onSave: (a: Account) => void;
  onClose: () => void;
}

function AccountPanel({ account, ownerOptions, onSave, onClose }: AccountPanelProps) {
  const [form, setForm] = useState<Account>({ ...account });
  const [seppEnabled, setSeppEnabled] = useState(account.sepp !== null);

  const defaultSepp: SEPPConfig = {
    method: "RMD",
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 5,
    annualAmount: 0,
  };

  function set<K extends keyof Account>(key: K, value: Account[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSeppToggle(enabled: boolean) {
    setSeppEnabled(enabled);
    setForm((f) => ({ ...f, sepp: enabled ? (f.sepp ?? defaultSepp) : null }));
  }

  function setSepp<K extends keyof SEPPConfig>(key: K, value: SEPPConfig[K]) {
    setForm((f) => ({
      ...f,
      sepp: { ...(f.sepp ?? defaultSepp), [key]: value },
    }));
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {account.id && account.name ? "Edit Account" : "Add Account"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Bob's Rollover IRA"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            />
          </div>

          {/* Owner */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
            <select
              value={form.owner}
              onChange={(e) => set("owner", e.target.value as Account["owner"])}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            >
              {ownerOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Account Type</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as AccountType)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            >
              {ACCOUNT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Balance */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Current Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={form.balance}
                onChange={(e) => set("balance", parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          {/* Annual Return Rate */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Annual Return Rate</label>
            <div className="relative">
              <input
                type="number"
                step={0.1}
                value={(form.annualReturnRate * 100).toFixed(1)}
                onChange={(e) => set("annualReturnRate", parseFloat(e.target.value) / 100 || 0)}
                className="w-full border border-slate-200 rounded-lg px-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>

          {/* Annual Contribution */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Annual Contribution</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={form.annualContribution}
                onChange={(e) => set("annualContribution", parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
              />
            </div>
          </div>

          {/* Contribution End Year */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Contribution End Year</label>
            <input
              type="number"
              value={form.contributionEndYear}
              onChange={(e) => set("contributionEndYear", parseInt(e.target.value) || 2030)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
            />
          </div>

          {/* 401k-specific checkboxes */}
          {is401k(form.type) && (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">401(k) Options</h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRuleOf55Eligible}
                  onChange={(e) => set("isRuleOf55Eligible", e.target.checked)}
                  className="accent-[#4A6FA5] w-4 h-4"
                />
                <span className="text-sm text-slate-700">Rule of 55 Eligible</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCurrentEmployer}
                  onChange={(e) => set("isCurrentEmployer", e.target.checked)}
                  className="accent-[#4A6FA5] w-4 h-4"
                />
                <span className="text-sm text-slate-700">Current Employer Plan</span>
              </label>
            </div>
          )}

          {/* SEPP Section */}
          {isTraditional(form.type) && (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">SEPP / 72(t)</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-500">Enable</span>
                  <div
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer",
                      seppEnabled ? "bg-[#4A6FA5]" : "bg-slate-300"
                    )}
                    onClick={() => handleSeppToggle(!seppEnabled)}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                        seppEnabled ? "translate-x-4.5" : "translate-x-1"
                      )}
                    />
                  </div>
                </label>
              </div>

              {seppEnabled && form.sepp && (
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
                    <select
                      value={form.sepp.method}
                      onChange={(e) => setSepp("method", e.target.value as SEPPConfig["method"])}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                    >
                      <option value="RMD">RMD Method</option>
                      <option value="AMORTIZATION">Amortization Method</option>
                      <option value="ANNUITIZATION">Annuitization Method</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Start Year</label>
                      <input
                        type="number"
                        value={form.sepp.startYear}
                        onChange={(e) => setSepp("startYear", parseInt(e.target.value) || 2026)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">End Year</label>
                      <input
                        type="number"
                        value={form.sepp.endYear}
                        onChange={(e) => setSepp("endYear", parseInt(e.target.value) || 2031)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Annual Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        value={form.sepp.annualAmount}
                        onChange={(e) => setSepp("annualAmount", parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]"
                      />
                    </div>
                  </div>
                </div>
              )}
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
            Save Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Account Card
// ============================================================
interface AccountCardProps {
  account: Account;
  ownerBirthYear: number;
  currentYear: number;
  onEdit: () => void;
  onDelete: () => void;
  onSepp: () => void;
}

function AccountCard({ account, ownerBirthYear, currentYear, onEdit, onDelete, onSepp }: AccountCardProps) {
  const ownerAge = currentYear - ownerBirthYear;
  const rmdRequired = ownerAge >= 73 && isTraditional(account.type);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">{account.name || "Unnamed Account"}</div>
          <span
            className={cn(
              "inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border",
              accountTypeBadge(account.type)
            )}
          >
            {accountTypeLabel(account.type)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div>
        <div className="text-2xl font-bold text-slate-800">{formatCurrency(account.balance)}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Return: {formatPercent(account.annualReturnRate)} &nbsp;·&nbsp; Contrib: {formatCurrency(account.annualContribution)}/yr
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {account.isRuleOf55Eligible && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            Rule of 55 Eligible
          </span>
        )}
        {rmdRequired && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            RMD Required
          </span>
        )}
        {account.sepp && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
            SEPP Active
          </span>
        )}
      </div>

      {/* SEPP Calculator button */}
      {isTraditional(account.type) && (
        <button
          onClick={onSepp}
          className="flex items-center gap-1.5 text-xs text-[#4A6FA5] hover:text-[#1B3A6B] font-medium transition-colors w-fit"
        >
          <Calculator className="w-3.5 h-3.5" />
          SEPP Calculator
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ============================================================
// Person Column
// ============================================================
interface PersonColumnProps {
  personId: "personA" | "personB" | "joint";
  personName: string;
  accounts: Account[];
  ownerBirthYear: number;
  currentYear: number;
  onEdit: (a: Account) => void;
  onDelete: (id: string) => void;
  onSepp: (a: Account) => void;
  onAdd: () => void;
}

function PersonColumn({
  personName,
  accounts,
  ownerBirthYear,
  currentYear,
  onEdit,
  onDelete,
  onSepp,
  onAdd,
}: PersonColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#1B3A6B]">{personName}</h2>
        <span className="text-xs text-slate-400">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
      </div>

      {accounts.map((acct) => (
        <AccountCard
          key={acct.id}
          account={acct}
          ownerBirthYear={ownerBirthYear}
          currentYear={currentYear}
          onEdit={() => onEdit(acct)}
          onDelete={() => onDelete(acct.id)}
          onSepp={() => onSepp(acct)}
        />
      ))}

      <button
        onClick={onAdd}
        className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-[#4A6FA5] hover:text-[#4A6FA5] transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Account
      </button>
    </div>
  );
}

// ============================================================
// Main Accounts View
// ============================================================
export default function Accounts() {
  const { state, dispatch } = useApp();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [seppAccount, setSeppAccount] = useState<Account | null>(null);
  const [addingFor, setAddingFor] = useState<"personA" | "personB" | "joint" | null>(null);

  const currentYear = state.settings.currentYear;
  const personA = state.persons[0];
  const personB = state.persons[1];

  const ownerOptions = useMemo(
    () => [
      { value: "personA" as const, label: personA?.name ?? "Person A" },
      { value: "personB" as const, label: personB?.name ?? "Person B" },
      { value: "joint" as const, label: "Joint" },
    ],
    [personA, personB]
  );

  const accountsA = state.accounts.filter((a) => a.owner === "personA");
  const accountsB = state.accounts.filter((a) => a.owner === "personB");
  const accountsJoint = state.accounts.filter((a) => a.owner === "joint");

  // Warning: 401k Rule of 55 without current employer
  const badRule55Accounts = state.accounts.filter(
    (a) => is401k(a.type) && !a.isCurrentEmployer && a.isRuleOf55Eligible
  );

  function handleSave(account: Account) {
    if (addingFor) {
      dispatch({ type: "ADD_ACCOUNT", payload: account });
    } else {
      dispatch({ type: "UPDATE_ACCOUNT", payload: account });
    }
    setEditingAccount(null);
    setAddingFor(null);
  }

  function handleDelete(id: string) {
    if (window.confirm("Are you sure you want to delete this account? This cannot be undone.")) {
      dispatch({ type: "DELETE_ACCOUNT", payload: id });
    }
  }

  function handleAddFor(owner: "personA" | "personB" | "joint") {
    setAddingFor(owner);
    setEditingAccount(newBlankAccount(owner));
  }

  function handleEdit(account: Account) {
    setAddingFor(null);
    setEditingAccount(account);
  }

  function getBirthYear(owner: "personA" | "personB" | "joint"): number {
    if (owner === "personA") return personA?.birthYear ?? 1975;
    if (owner === "personB") return personB?.birthYear ?? 1975;
    return personA?.birthYear ?? 1975;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Warning Banner */}
      {badRule55Accounts.length > 0 && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-300 text-orange-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Rule of 55 Warning:</strong> Rolling a 401(k) to an IRA before retirement at age 55+
            forfeits the Rule of 55 penalty-free access. Affected accounts:{" "}
            {badRule55Accounts.map((a) => a.name).join(", ")}
          </span>
        </div>
      )}

      {/* Two-column layout for Person A and B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PersonColumn
          personId="personA"
          personName={personA?.name ?? "Person A"}
          accounts={accountsA}
          ownerBirthYear={personA?.birthYear ?? 1975}
          currentYear={currentYear}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSepp={setSeppAccount}
          onAdd={() => handleAddFor("personA")}
        />
        <PersonColumn
          personId="personB"
          personName={personB?.name ?? "Person B"}
          accounts={accountsB}
          ownerBirthYear={personB?.birthYear ?? 1975}
          currentYear={currentYear}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSepp={setSeppAccount}
          onAdd={() => handleAddFor("personB")}
        />
      </div>

      {/* Joint Accounts Row */}
      {(accountsJoint.length > 0 || true) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-bold text-[#1B3A6B]">Joint Accounts</h2>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">{accountsJoint.length} account{accountsJoint.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accountsJoint.map((acct) => (
              <AccountCard
                key={acct.id}
                account={acct}
                ownerBirthYear={getBirthYear("joint")}
                currentYear={currentYear}
                onEdit={() => handleEdit(acct)}
                onDelete={() => handleDelete(acct.id)}
                onSepp={() => setSeppAccount(acct)}
              />
            ))}
            <button
              onClick={() => handleAddFor("joint")}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 text-sm text-slate-400 hover:border-[#4A6FA5] hover:text-[#4A6FA5] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Joint Account
            </button>
          </div>
        </div>
      )}

      {/* Side Panel */}
      {editingAccount && (
        <AccountPanel
          account={editingAccount}
          ownerOptions={ownerOptions}
          onSave={handleSave}
          onClose={() => {
            setEditingAccount(null);
            setAddingFor(null);
          }}
        />
      )}

      {/* SEPP Modal */}
      {seppAccount && (
        <SeppModal
          account={seppAccount}
          ownerBirthYear={getBirthYear(seppAccount.owner)}
          currentYear={currentYear}
          onClose={() => setSeppAccount(null)}
        />
      )}
    </div>
  );
}
