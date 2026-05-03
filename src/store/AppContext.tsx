import { createContext, useContext, useReducer, type ReactNode } from "react";
import {
  type ParsedFile,
  type IdentifierAlias,
  type IdentifierId,
  type ConflictInfo,
  ViewMode,
  DEFAULT_PRICE_PER_KWH,
} from "../types";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface AppState {
  files: ParsedFile[];
  aliases: IdentifierAlias[];
  viewMode: ViewMode;
  pricePerKwh: number;
  pendingConflicts: ConflictInfo[];
}

const initialState: AppState = {
  files: [],
  aliases: [],
  viewMode: ViewMode.List,
  pricePerKwh: DEFAULT_PRICE_PER_KWH,
  pendingConflicts: [],
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "ADD_FILES"; payload: ParsedFile[] }
  | { type: "REMOVE_FILE"; payload: string } // yearMonth
  | { type: "SET_ALIAS"; payload: { id: IdentifierId; alias: string } }
  | { type: "SET_VIEW_MODE"; payload: ViewMode }
  | { type: "SET_PRICE"; payload: number }
  | { type: "RESOLVE_CONFLICT"; payload: { yearMonth: string; accept: boolean } }
  | { type: "DISMISS_CONFLICT"; payload: string }; // yearMonth

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeAliases(existing: IdentifierAlias[], newIds: IdentifierId[]): IdentifierAlias[] {
  const result = [...existing];
  for (const id of newIds) {
    if (!result.some(a => a.id === id)) {
      result.push({ id, alias: "" });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_FILES": {
      const incoming = action.payload;
      const conflicts: ConflictInfo[] = [];
      const toAdd: ParsedFile[] = [];

      for (const file of incoming) {
        const existing = state.files.find(f => f.yearMonth === file.yearMonth);
        if (existing) {
          const consumptionMatch =
            JSON.stringify(existing.consumption) === JSON.stringify(file.consumption);
          const isIdentical = consumptionMatch && existing.rowCount === file.rowCount;
          conflicts.push({
            fileName: file.fileName,
            yearMonth: file.yearMonth,
            existing,
            incoming: file,
            isIdentical,
          });
        } else {
          toAdd.push(file);
        }
      }

      // Collect all new identifier IDs
      const allNewIds = toAdd.flatMap(f => Object.keys(f.consumption));

      return {
        ...state,
        files: [...state.files, ...toAdd],
        aliases: mergeAliases(state.aliases, allNewIds),
        pendingConflicts: [...state.pendingConflicts, ...conflicts],
      };
    }

    case "REMOVE_FILE": {
      const updated = state.files.filter(f => f.yearMonth !== action.payload);
      return { ...state, files: updated };
    }

    case "SET_ALIAS": {
      const { id, alias } = action.payload;
      return {
        ...state,
        aliases: state.aliases.map(a => (a.id === id ? { ...a, alias } : a)),
      };
    }

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };

    case "SET_PRICE":
      return { ...state, pricePerKwh: action.payload };

    case "RESOLVE_CONFLICT": {
      const { yearMonth, accept } = action.payload;
      const conflict = state.pendingConflicts.find(c => c.yearMonth === yearMonth);

      if (!conflict) return state;

      const remaining = state.pendingConflicts.filter(c => c.yearMonth !== yearMonth);

      if (!accept) {
        return { ...state, pendingConflicts: remaining };
      }

      // Replace the existing file with the incoming one
      const updatedFiles = state.files.map(f =>
        f.yearMonth === yearMonth ? conflict.incoming : f,
      );

      const allNewIds = Object.keys(conflict.incoming.consumption);

      return {
        ...state,
        files: updatedFiles,
        aliases: mergeAliases(state.aliases, allNewIds),
        pendingConflicts: remaining,
      };
    }

    case "DISMISS_CONFLICT": {
      return {
        ...state,
        pendingConflicts: state.pendingConflicts.filter(c => c.yearMonth !== action.payload),
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used inside AppProvider");
  return ctx;
}
