import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/AppContext";
import Layout from "./components/Layout";
import type { ViewName } from "./components/Layout";
import FirstRunWizard from "./components/FirstRunWizard";
import Dashboard from "./views/Dashboard";
import Accounts from "./views/Accounts";
import IncomeExpenses from "./views/IncomeExpenses";
import Withdrawals from "./views/Withdrawals";
import RothPlanner from "./views/RothPlanner";
import TaxAnalysis from "./views/TaxAnalysis";
import YearByYear from "./views/YearByYear";
import Inheritance from "./views/Inheritance";
import Scenarios from "./views/Scenarios";
import Settings from "./views/Settings";

function AppContent() {
  const [activeView, setActiveView] = useState<ViewName>("dashboard");
  const { state } = useApp();
  const [wizardDone, setWizardDone] = useState(state.hasCompletedWizard);

  function renderView() {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "accounts":
        return <Accounts />;
      case "income":
        return <IncomeExpenses />;
      case "withdrawals":
        return <Withdrawals />;
      case "roth":
        return <RothPlanner />;
      case "tax":
        return <TaxAnalysis />;
      case "yearByYear":
        return <YearByYear />;
      case "inheritance":
        return <Inheritance />;
      case "scenarios":
        return <Scenarios />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <>
      {!wizardDone && <FirstRunWizard onComplete={() => setWizardDone(true)} />}
      <Layout activeView={activeView} onNavigate={setActiveView}>
        {renderView()}
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
