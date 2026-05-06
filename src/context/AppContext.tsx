import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useEffect,
  type Dispatch,
} from "react";
import type { ReactNode } from "react";
import type {
  AppState,
  AppSettings,
  Account,
  IncomeSource,
  SocialSecurity,
  Expense,
  WithdrawalStrategy,
  RothConversionPlan,
  Person,
  SavedScenario,
  YearResult,
} from "../types";
import { DEFAULT_APP_STATE } from "../constants/defaultData";
import { simulate } from "../engine/simulator";

// ============================================================
// Action Types
// ============================================================

type AppAction =
  | { type: "UPDATE_PERSON"; payload: Person }
  | { type: "UPDATE_ACCOUNT"; payload: Account }
  | { type: "ADD_ACCOUNT"; payload: Account }
  | { type: "DELETE_ACCOUNT"; payload: string }
  | { type: "UPDATE_INCOME_SOURCE"; payload: IncomeSource }
  | { type: "ADD_INCOME_SOURCE"; payload: IncomeSource }
  | { type: "DELETE_INCOME_SOURCE"; payload: string }
  | { type: "UPDATE_SS"; payload: SocialSecurity }
  | { type: "UPDATE_EXPENSE"; payload: Expense }
  | { type: "ADD_EXPENSE"; payload: Expense }
  | { type: "DELETE_EXPENSE"; payload: string }
  | { type: "UPDATE_WITHDRAWAL_STRATEGY"; payload: WithdrawalStrategy }
  | { type: "UPDATE_ROTH_CONVERSION_PLAN"; payload: RothConversionPlan }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppSettings> }
  | { type: "SAVE_SCENARIO"; payload: { name: string } }
  | { type: "LOAD_SCENARIO"; payload: string }
  | { type: "DELETE_SCENARIO"; payload: string }
  | { type: "RESET_TO_DEFAULT" }
  | { type: "COMPLETE_WIZARD" }
  | { type: "LOAD_STATE"; payload: AppState };

// ============================================================
// Reducer
// ============================================================

const STORAGE_KEY = "calculatedRetirement_state";

function saveToLocalStorage(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  let next: AppState;

  switch (action.type) {
    case "UPDATE_PERSON":
      next = {
        ...state,
        persons: state.persons.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
      break;

    case "UPDATE_ACCOUNT":
      next = {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
      break;

    case "ADD_ACCOUNT":
      next = {
        ...state,
        accounts: [...state.accounts, action.payload],
      };
      break;

    case "DELETE_ACCOUNT":
      next = {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
        withdrawalStrategy: {
          ...state.withdrawalStrategy,
          priorityOrder: state.withdrawalStrategy.priorityOrder.filter(
            (id) => id !== action.payload
          ),
          overrides: state.withdrawalStrategy.overrides.filter(
            (o) => o.accountId !== action.payload
          ),
        },
      };
      break;

    case "UPDATE_INCOME_SOURCE":
      next = {
        ...state,
        incomeSources: state.incomeSources.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
      break;

    case "ADD_INCOME_SOURCE":
      next = {
        ...state,
        incomeSources: [...state.incomeSources, action.payload],
      };
      break;

    case "DELETE_INCOME_SOURCE":
      next = {
        ...state,
        incomeSources: state.incomeSources.filter(
          (s) => s.id !== action.payload
        ),
      };
      break;

    case "UPDATE_SS":
      next = {
        ...state,
        socialSecurity: state.socialSecurity.map((ss) =>
          ss.personId === action.payload.personId ? action.payload : ss
        ),
      };
      break;

    case "UPDATE_EXPENSE":
      next = {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
      break;

    case "ADD_EXPENSE":
      next = {
        ...state,
        expenses: [...state.expenses, action.payload],
      };
      break;

    case "DELETE_EXPENSE":
      next = {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };
      break;

    case "UPDATE_WITHDRAWAL_STRATEGY":
      next = {
        ...state,
        withdrawalStrategy: action.payload,
      };
      break;

    case "UPDATE_ROTH_CONVERSION_PLAN":
      next = {
        ...state,
        rothConversionPlan: action.payload,
      };
      break;

    case "UPDATE_SETTINGS":
      next = {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
      break;

    case "SAVE_SCENARIO": {
      const { scenarios, ...snapshotState } = state;
      void scenarios;
      const newScenario: SavedScenario = {
        id: `scenario-${Date.now()}`,
        name: action.payload.name,
        savedAt: new Date().toISOString(),
        state: snapshotState,
      };
      next = {
        ...state,
        scenarios: [...state.scenarios, newScenario],
        activeScenarioId: newScenario.id,
      };
      break;
    }

    case "LOAD_SCENARIO": {
      const scenario = state.scenarios.find((s) => s.id === action.payload);
      if (!scenario) {
        next = state;
        break;
      }
      next = {
        ...state,
        ...scenario.state,
        scenarios: state.scenarios,
        activeScenarioId: scenario.id,
      };
      break;
    }

    case "DELETE_SCENARIO":
      next = {
        ...state,
        scenarios: state.scenarios.filter((s) => s.id !== action.payload),
        activeScenarioId:
          state.activeScenarioId === action.payload
            ? null
            : state.activeScenarioId,
      };
      break;

    case "RESET_TO_DEFAULT":
      next = {
        ...DEFAULT_APP_STATE,
        scenarios: state.scenarios,
      };
      break;

    case "COMPLETE_WIZARD":
      next = {
        ...state,
        hasCompletedWizard: true,
      };
      break;

    case "LOAD_STATE":
      next = action.payload;
      break;

    default:
      next = state;
  }

  saveToLocalStorage(next);
  return next;
}

// ============================================================
// Context
// ============================================================

interface AppContextValue {
  state: AppState;
  simulation: YearResult[];
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

function loadFromLocalStorage(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_STATE;
    const parsed = JSON.parse(raw) as AppState;
    return parsed;
  } catch {
    return DEFAULT_APP_STATE;
  }
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadFromLocalStorage);

  // Re-run simulation whenever state changes
  const simulation = useMemo<YearResult[]>(() => {
    try {
      return simulate(state);
    } catch {
      return [];
    }
  }, [state]);

  // Persist on mount (in case default state was used)
  useEffect(() => {
    saveToLocalStorage(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ state, simulation, dispatch }),
    [state, simulation]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
}
