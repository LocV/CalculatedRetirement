import { useState } from "react";
import type { ReactNode } from "react";
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
  X,
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
  icon: ReactNode;
}

interface LayoutProps {
  children: ReactNode;
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
}

// ============================================================
// Constants
// ============================================================

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   label: "Dashboard",        icon: <LayoutDashboard size={14} /> },
  { id: "accounts",    label: "Accounts",          icon: <Wallet size={14} /> },
  { id: "income",      label: "Income & Expenses", icon: <DollarSign size={14} /> },
  { id: "withdrawals", label: "Withdrawals",       icon: <ArrowDownCircle size={14} /> },
  { id: "roth",        label: "Roth Planner",      icon: <RefreshCw size={14} /> },
  { id: "tax",         label: "Tax Analysis",      icon: <Calculator size={14} /> },
  { id: "yearByYear",  label: "Year-by-Year",      icon: <Table size={14} /> },
  { id: "inheritance", label: "Inheritance",       icon: <Building2 size={14} /> },
  { id: "scenarios",   label: "Scenarios",         icon: <GitBranch size={14} /> },
  { id: "settings",    label: "Settings",          icon: <Settings size={14} /> },
];

const VIEW_TITLES: Record<ViewName, string> = {
  dashboard:   "Dashboard",
  accounts:    "Accounts",
  income:      "Income & Expenses",
  withdrawals: "Withdrawals",
  roth:        "Roth Planner",
  tax:         "Tax Analysis",
  yearByYear:  "Year-by-Year",
  inheritance: "Inheritance",
  scenarios:   "Scenarios",
  settings:    "Settings",
};

// ============================================================
// Save Scenario Modal
// ============================================================

function SaveScenarioModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box p-6" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Save Scenario</h2>
          <button onClick={onClose} style={{ color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="e.g. Both retire at 55"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Scenario
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

  const activeScenario = state.scenarios.find((s) => s.id === state.activeScenarioId);
  const scenarioLabel = activeScenario ? activeScenario.name : "Default";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ---- Sidebar ---- */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: "#071008",
        borderRight: "1px solid var(--border-soft)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 30,
        overflowY: "auto",
      }}>
        {/* Brand mark */}
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--border-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {/* Diamond brand mark */}
            <div style={{
              width: 8, height: 8,
              background: "var(--account-401k)",
              transform: "rotate(45deg)",
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.22em",
              color: "var(--account-401k)", textTransform: "uppercase",
            }}>
              RetireSmart
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-softer)", paddingLeft: 16 }}>
            Drawdown Atlas
          </p>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 4,
                  border: "none",
                  borderLeft: isActive ? "2px solid var(--account-401k)" : "2px solid transparent",
                  background: isActive ? "rgba(63,167,107,0.12)" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink-soft)",
                  fontSize: 12,
                  fontWeight: isActive ? 500 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 140ms",
                  marginBottom: 1,
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--ink-soft)";
                  }
                }}
              >
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border-soft)" }}>
          <p style={{ fontSize: 10, color: "var(--ink-softer)", letterSpacing: "0.06em" }}>
            Powered by Claude
          </p>
        </div>
      </aside>

      {/* ---- Main area ---- */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 220, minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          background: "rgba(7,16,8,0.92)",
          borderBottom: "1px solid var(--border-soft)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>
            {VIEW_TITLES[activeView]}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="chip chip-sm" style={{ cursor: "default" }}>
              {scenarioLabel}
            </button>
            <button className="chip chip-sm" onClick={() => setShowSaveModal(true)}>
              Save Scenario
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>

      {showSaveModal && (
        <SaveScenarioModal
          onSave={(name) => dispatch({ type: "SAVE_SCENARIO", payload: { name } })}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
