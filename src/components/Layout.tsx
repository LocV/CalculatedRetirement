import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  DollarSign,
  ArrowDownCircle,
  RefreshCw,
  Calculator,
  Table,
  Building2,
  GitBranch,
  Settings,
} from "lucide-react";
import { useApp } from "../context/AppContext";

// ============================================================
// Types
// ============================================================

export type ViewName =
  | "dashboard"
  | "accounts"
  | "income"
  | "withdrawals"
  | "roth"
  | "tax"
  | "yearByYear"
  | "inheritance"
  | "scenarios"
  | "settings";

interface NavItem {
  id: ViewName;
  label: string;
  icon: React.ReactNode;
}

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
}

// ============================================================
// Nav Config
// ============================================================

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "accounts", label: "Accounts", icon: <Wallet size={18} /> },
  { id: "income", label: "Income & Expenses", icon: <DollarSign size={18} /> },
  { id: "withdrawals", label: "Withdrawals", icon: <ArrowDownCircle size={18} /> },
  { id: "roth", label: "Roth Planner", icon: <RefreshCw size={18} /> },
  { id: "tax", label: "Tax Analysis", icon: <Calculator size={18} /> },
  { id: "yearByYear", label: "Year-by-Year", icon: <Table size={18} /> },
  { id: "inheritance", label: "Inheritance", icon: <Building2 size={18} /> },
  { id: "scenarios", label: "Scenarios", icon: <GitBranch size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

const VIEW_TITLES: Record<ViewName, string> = {
  dashboard: "Dashboard",
  accounts: "Accounts",
  income: "Income & Expenses",
  withdrawals: "Withdrawals",
  roth: "Roth Planner",
  tax: "Tax Analysis",
  yearByYear: "Year-by-Year",
  inheritance: "Inheritance",
  scenarios: "Scenarios",
  settings: "Settings",
};

// ============================================================
// Save Scenario Modal
// ============================================================

interface SaveScenarioModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
}

function SaveScenarioModal({ onSave, onClose }: SaveScenarioModalProps) {
  const [name, setName] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Save Scenario
        </h2>
        <input
          autoFocus
          type="text"
          placeholder="Scenario name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Layout
// ============================================================

export default function Layout({ children, activeView, onNavigate }: LayoutProps) {
  const { state, dispatch } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const activeScenario = state.scenarios.find(
    (s) => s.id === state.activeScenarioId
  );
  const scenarioLabel = activeScenario ? activeScenario.name : "Default";

  function handleSaveScenario(name: string) {
    dispatch({ type: "SAVE_SCENARIO", payload: { name } });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---- Sidebar ---- */}
      <aside
        className="flex flex-col shrink-0 overflow-y-auto"
        style={{
          width: 240,
          backgroundColor: "#1B3A6B",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 30,
        }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-white font-bold text-base leading-tight tracking-tight">
            CalculatedRetirement
          </p>
          <p className="text-white/50 text-xs mt-0.5">Retirement Planner</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/65 hover:bg-white/8 hover:text-white",
                ].join(" ")}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white/30 text-xs">Powered by Claude</p>
        </div>
      </aside>

      {/* ---- Main area ---- */}
      <div className="flex flex-col flex-1 min-w-0" style={{ marginLeft: 240 }}>
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
        >
          <h1 className="text-lg font-semibold text-slate-800">
            {VIEW_TITLES[activeView]}
          </h1>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Scenario:{" "}
              <span className="font-medium text-slate-700">{scenarioLabel}</span>
            </span>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Save Scenario
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <SaveScenarioModal
          onSave={handleSaveScenario}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
