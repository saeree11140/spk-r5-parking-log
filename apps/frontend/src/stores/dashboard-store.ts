import { create } from "zustand";

export type HouseFilter =
  | "ALL"
  | "ACTIVE_VIOLATIONS"
  | "PENDING_FINE"
  | "NO_CURRENT_ACTIVITY"
  | "INACTIVE";

interface DashboardState {
  houseFilter: HouseFilter;
  searchQuery: string;
  sidebarCollapsed: boolean;
  resetDashboard: () => void;
  setHouseFilter: (filter: HouseFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
}

const initialState = {
  houseFilter: "ALL" as const,
  searchQuery: "",
  sidebarCollapsed: false,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,
  resetDashboard: () => set(initialState),
  setHouseFilter: (houseFilter) => set({ houseFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
