import { create } from "zustand";

export type HouseFilter =
  | "ALL"
  | "ACTIVE_VIOLATIONS"
  | "PENDING_FINE"
  | "NO_CURRENT_ACTIVITY"
  | "INACTIVE";

/** "ALL" or a violation category id. */
export type CategoryFilter = string;

export const ALL_CATEGORIES: CategoryFilter = "ALL";

interface DashboardState {
  categoryFilter: CategoryFilter;
  houseFilter: HouseFilter;
  searchQuery: string;
  sidebarCollapsed: boolean;
  resetDashboard: () => void;
  setCategoryFilter: (filter: CategoryFilter) => void;
  setHouseFilter: (filter: HouseFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
}

const initialState = {
  categoryFilter: ALL_CATEGORIES,
  houseFilter: "ALL" as const,
  searchQuery: "",
  sidebarCollapsed: false,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,
  resetDashboard: () => set(initialState),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setHouseFilter: (houseFilter) => set({ houseFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
