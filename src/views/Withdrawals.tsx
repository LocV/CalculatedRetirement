import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { GripVertical, X, Copy } from "lucide-react";
import { useApp } from "../context/AppContext";
import { AccountType } from "../types";
import type { WithdrawalOverride } from "../types";
import { formatCurrency, cn } from "../utils/formatters";

// ─── helpers ────────────────────────────────────────────────────────────────

function typeBadge(type: AccountType): string {
  const map: Partial<Record<AccountType, string>> = {
    [AccountType.TRADITIONAL_IRA]: "Trad IRA",
    [AccountType.ROTH_IRA]: "Roth IRA",
    [AccountType.TRADITIONAL_401K]: "401k",
    [AccountType.ROTH_401K]: "Roth 401k",
    [AccountType.BROKERAGE]: "Brokerage",
    [AccountType.HSA]: "HSA",
    [AccountType.SAVINGS_CASH]: "Cash",
    [AccountType.PENSION]: "Pension",
  };
  return map[type] ?? type;
}

// ─── Override Modal ──────────────────────────────────────────────────────────

interface OverrideModalProps {
  accountIds: string[];
  accountNames: Record<string, string>;
  onSave: (o: WithdrawalOverride) => void;
  onClose: () => void;
}

function OverrideModal({ accountIds, accountNames, onSave, onClose }: OverrideModalProps) {
  const [accountId, setAccountId] = useState(accountIds[0] ?? "");
  const [startYear, setStartYear] = useState(2026);
  const [endYear, setEndYear] = useState(2026);
  const [annualAmount, setAnnualAmount] = useState(0);

  function handleSave() {
    if (!accountId) return;
    onSave({ accountId, startYear, endYear, annualAmount });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#1B3A6B]">Add Withdrawal Override</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {accountIds.map((id) => (
                <option key={id} value={id}>{accountNames[id] ?? id}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Year</label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Year</label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Annual Amount ($)</label>
            <input
              type="number"
              value={annualAmount}
              onChange={(e) => setAnnualAmount(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5]"
          >
            Save Override
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auto Mode ───────────────────────────────────────────────────────────────

function AutoMode() {
  const { state, simulation, dispatch } = useApp();
  const { withdrawalStrategy, accounts } = state;
  const [showModal, setShowModal] = useState(false);

  const orderedAccounts = withdrawalStrategy.priorityOrder
    .map((id) => accounts.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);

  const unmapped = accounts.filter(
    (a) => !withdrawalStrategy.priorityOrder.includes(a.id)
  );
  const allOrdered = [...orderedAccounts, ...unmapped];

  function hasRMD(accountId: string) {
    return simulation.some((yr) => (yr.rmds[accountId] ?? 0) > 0);
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const items = allOrdered.map((a) => a.id);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    dispatch({
      type: "UPDATE_WITHDRAWAL_STRATEGY",
      payload: { ...withdrawalStrategy, priorityOrder: items },
    });
  }

  function addOverride(o: WithdrawalOverride) {
    dispatch({
      type: "UPDATE_WITHDRAWAL_STRATEGY",
      payload: {
        ...withdrawalStrategy,
        overrides: [...withdrawalStrategy.overrides, o],
      },
    });
  }

  function removeOverride(idx: number) {
    const overrides = withdrawalStrategy.overrides.filter((_, i) => i !== idx);
    dispatch({
      type: "UPDATE_WITHDRAWAL_STRATEGY",
      payload: { ...withdrawalStrategy, overrides },
    });
  }

  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const personAName = state.persons.find((p) => p.id === "personA")?.name ?? "Person A";
  const personBName = state.persons.find((p) => p.id === "personB")?.name ?? "Person B";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
          Withdrawal Priority Order
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Drag accounts to set the order funds are withdrawn from each year.
        </p>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="accounts">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {allOrdered.map((account, index) => {
                  const labels: string[] = [];
                  if (account.isRuleOf55Eligible && account.isCurrentEmployer) {
                    labels.push("Rule of 55 — Available at age 55");
                  }
                  if (account.sepp !== null) {
                    labels.push(`SEPP — Fixed $${account.sepp.annualAmount.toLocaleString()}/yr`);
                  }
                  if (
                    account.type === AccountType.ROTH_IRA ||
                    account.type === AccountType.ROTH_401K
                  ) {
                    labels.push("Roth — Draw Last (tax-free)");
                  }
                  if (hasRMD(account.id)) {
                    labels.push("RMD Required at 73");
                  }

                  const ownerLabel =
                    account.owner === "personA"
                      ? personAName
                      : account.owner === "personB"
                      ? personBName
                      : "Joint";

                  return (
                    <Draggable key={account.id} draggableId={account.id} index={index}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={cn(
                            "flex items-start gap-3 p-4 bg-white rounded-xl border transition-shadow",
                            snapshot.isDragging
                              ? "shadow-lg border-[#4A6FA5]"
                              : "border-slate-200 shadow-sm"
                          )}
                        >
                          <div
                            {...prov.dragHandleProps}
                            className="mt-0.5 text-slate-400 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-800">{account.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] font-medium">
                                {typeBadge(account.type)}
                              </span>
                              <span className="text-xs text-slate-500">{ownerLabel}</span>
                            </div>
                            {labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {labels.map((label) => (
                                  <span
                                    key={label}
                                    className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono mt-1">#{index + 1}</span>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Year-Specific Overrides
          </h3>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1B3A6B] text-white hover:bg-[#4A6FA5] transition-colors"
          >
            + Override for Specific Years
          </button>
        </div>
        {withdrawalStrategy.overrides.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No overrides set.</p>
        ) : (
          <div className="space-y-2">
            {withdrawalStrategy.overrides.map((o, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm"
              >
                <div className="text-sm text-slate-700">
                  <span className="font-medium">{accountNames[o.accountId] ?? o.accountId}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span>{o.startYear}–{o.endYear}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="font-medium text-[#1B3A6B]">{formatCurrency(o.annualAmount)}/yr</span>
                </div>
                <button
                  onClick={() => removeOverride(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <OverrideModal
          accountIds={accounts.map((a) => a.id)}
          accountNames={accountNames}
          onSave={addOverride}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── Manual Mode ─────────────────────────────────────────────────────────────

function ManualMode() {
  const { state, simulation, dispatch } = useApp();
  const { withdrawalStrategy, accounts, settings } = state;

  const startYear = settings.currentYear;
  const endYear = startYear + 20;
  const years = simulation.filter(
    (yr) => yr.year >= startYear && yr.year <= endYear
  );

  function getOverrideAmount(accountId: string, year: number): number {
    const ov = withdrawalStrategy.overrides.find(
      (o) =>
        o.accountId === accountId &&
        year >= o.startYear &&
        year <= o.endYear
    );
    return ov?.annualAmount ?? 0;
  }

  function setOverride(accountId: string, year: number, amount: number) {
    const existing = withdrawalStrategy.overrides.findIndex(
      (o) =>
        o.accountId === accountId &&
        o.startYear === year &&
        o.endYear === year
    );
    const overrides = [...withdrawalStrategy.overrides];
    if (existing >= 0) {
      if (amount === 0) {
        overrides.splice(existing, 1);
      } else {
        overrides[existing] = { accountId, startYear: year, endYear: year, annualAmount: amount };
      }
    } else if (amount > 0) {
      overrides.push({ accountId, startYear: year, endYear: year, annualAmount: amount });
    }
    dispatch({
      type: "UPDATE_WITHDRAWAL_STRATEGY",
      payload: { ...withdrawalStrategy, overrides },
    });
  }

  function copyRow(year: number) {
    const newOverrides: WithdrawalOverride[] = accounts.map((acc) => ({
      accountId: acc.id,
      startYear: year + 1,
      endYear: year + 1,
      annualAmount: getOverrideAmount(acc.id, year),
    }));
    dispatch({
      type: "UPDATE_WITHDRAWAL_STRATEGY",
      payload: {
        ...withdrawalStrategy,
        overrides: [...withdrawalStrategy.overrides, ...newOverrides],
      },
    });
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-20">
              Year
            </th>
            {accounts.map((acc) => (
              <th key={acc.id} className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                {acc.name}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">Total</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">Surplus/Deficit</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">Copy</th>
          </tr>
        </thead>
        <tbody>
          {years.map((yr) => {
            const totalWithdrawals = accounts.reduce(
              (sum, acc) => sum + getOverrideAmount(acc.id, yr.year),
              0
            );
            const surplus = yr.surplus;
            const isShortfall = yr.hasShortfall;

            return (
              <tr
                key={yr.year}
                className={cn(
                  "border-t border-slate-100",
                  isShortfall ? "bg-red-50" : surplus > yr.totalExpenses * 0.2 ? "bg-green-50" : "bg-white"
                )}
              >
                <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-inherit whitespace-nowrap">
                  {yr.year}
                </td>
                {accounts.map((acc) => {
                  const rmd = yr.rmds[acc.id] ?? 0;
                  const val = getOverrideAmount(acc.id, yr.year);
                  const belowRmd = rmd > 0 && val < rmd;

                  return (
                    <td key={acc.id} className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        min={rmd}
                        value={val}
                        onChange={(e) => setOverride(acc.id, yr.year, Math.max(rmd, Number(e.target.value)))}
                        className={cn(
                          "w-28 text-right border rounded px-2 py-1 text-sm",
                          belowRmd ? "border-red-400 bg-red-50" : "border-slate-200"
                        )}
                      />
                      {rmd > 0 && (
                        <div className={cn("text-xs mt-0.5", belowRmd ? "text-red-600 font-medium" : "text-slate-400")}>
                          RMD: {formatCurrency(rmd)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-medium text-slate-700 whitespace-nowrap">
                  {formatCurrency(totalWithdrawals)}
                </td>
                <td className={cn(
                  "px-3 py-2 text-right font-medium whitespace-nowrap",
                  surplus < 0 ? "text-red-600" : "text-green-600"
                )}>
                  {surplus >= 0 ? "+" : ""}{formatCurrency(surplus)}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => copyRow(yr.year)}
                    title="Copy row to next year"
                    className="text-slate-400 hover:text-[#1B3A6B] transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Withdrawals() {
  const { state, dispatch } = useApp();
  const { withdrawalStrategy } = state;
  const mode = withdrawalStrategy.mode;

  function setMode(m: "AUTO" | "MANUAL") {
    dispatch({
      type: "UPDATE_WITHDRAWAL_STRATEGY",
      payload: { ...withdrawalStrategy, mode: m },
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B3A6B]">Withdrawal Strategy</h2>
        <p className="text-slate-500 mt-1">
          Control how and when funds are pulled from each account.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(["AUTO", "MANUAL"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
              mode === m
                ? "bg-[#1B3A6B] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "AUTO" ? <AutoMode /> : <ManualMode />}
    </div>
  );
}
