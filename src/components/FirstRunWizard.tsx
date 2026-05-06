import { useState } from "react";
import { useApp } from "../context/AppContext";
import { formatCurrency } from "../utils/formatters";

interface Props {
  onComplete: () => void;
}

export default function FirstRunWizard({ onComplete }: Props) {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [returnRate, setReturnRate] = useState(6);

  const personA = state.persons[0];
  const personB = state.persons[1];

  function handleComplete() {
    dispatch({ type: "UPDATE_SETTINGS", payload: { returnRateOverride: returnRate === 6 ? null : returnRate / 100 } });
    dispatch({ type: "COMPLETE_WIZARD" });
    onComplete();
  }

  const steps = [
    {
      title: "Welcome to CalculatedRetirement",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 text-lg">
            Your complete financial profile has been pre-loaded. This wizard will walk you through
            confirming a few key details before you start modeling your retirement.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">Pre-loaded profile includes:</p>
            <ul className="mt-2 space-y-1 text-blue-700 text-sm list-disc list-inside">
              <li>8 retirement and investment accounts</li>
              <li>3 income sources (W-2, rental, pension)</li>
              <li>Social Security estimates for both spouses</li>
              <li>3 pre-configured retirement scenarios</li>
              <li>Roth conversion plan (2030–2042)</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Confirm Your Names & Ages",
      content: (
        <div className="space-y-6">
          {[personA, personB].map((person) => (
            <div key={person.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{person.name}</h3>
                <span className="text-sm text-gray-500">Born {person.birthYear} · Retires {person.retirementYear}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    defaultValue={person.name}
                    onChange={(e) => dispatch({ type: "UPDATE_PERSON", payload: { ...person, name: e.target.value } })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Birth Year</label>
                  <input
                    type="number"
                    defaultValue={person.birthYear}
                    onChange={(e) => dispatch({ type: "UPDATE_PERSON", payload: { ...person, birthYear: parseInt(e.target.value) } })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Planned Retirement Year</label>
                  <input
                    type="number"
                    defaultValue={person.retirementYear}
                    onChange={(e) => dispatch({ type: "UPDATE_PERSON", payload: { ...person, retirementYear: parseInt(e.target.value) } })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Review Pre-Loaded Accounts",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">These accounts have been loaded with current balances. You can edit them anytime from the Accounts view.</p>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Account</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Owner</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.accounts.map((acc) => {
                  const owner = state.persons.find(p => p.id === acc.owner)?.name ?? "Joint";
                  return (
                    <tr key={acc.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{acc.name}</td>
                      <td className="px-3 py-2 text-gray-600">{owner}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-800">{formatCurrency(acc.balance)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{(acc.annualReturnRate * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-3 py-2 font-semibold text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right font-semibold font-mono text-gray-900">
                    {formatCurrency(state.accounts.reduce((s, a) => s + a.balance, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: "Set Investment Return Rate",
      content: (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            All accounts default to 6% annual return. You can set a global assumption here or
            customize per-account in the Accounts view.
          </p>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Annual Investment Return</label>
              <span className="text-lg font-bold text-blue-700">{returnRate}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={0.5}
              value={returnRate}
              onChange={(e) => setReturnRate(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1% (conservative)</span>
              <span>6% (historical avg)</span>
              <span>12% (aggressive)</span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Note:</strong> Historical US stock market real returns average ~7% nominal. Using 6% accounts
            for a balanced portfolio with bonds. This can be changed anytime in Settings.
          </div>
        </div>
      ),
    },
    {
      title: "Choose Your Starting Scenario",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Three scenarios have been pre-configured based on your profile. You can switch between them anytime.</p>
          {[
            { name: "Both Retire at 55", desc: "Bob and Spouse both retire in 2030. Uses Rule of 55 bridge from 401(k)s.", tag: "default" },
            { name: "Both Retire at 51", desc: "Both retire now in 2026. Requires SEPP / 72(t) from IRA.", tag: "aggressive" },
            { name: "Bob Retires Now", desc: "Bob retires in 2026, Spouse continues to 2030.", tag: "phased" },
          ].map((scenario, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 mt-0.5 flex items-center justify-center">
                {i === 0 && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{scenario.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{scenario.desc}</p>
              </div>
              <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${i === 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {scenario.tag}
              </span>
            </div>
          ))}
          <p className="text-xs text-gray-400">Scenario selection is pre-loaded. Visit the Scenarios view to switch or compare.</p>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{current.title}</h2>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 min-h-[280px]">
          {current.content}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-blue-600" : "bg-gray-300"}`} />
            ))}
          </div>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Get Started →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
