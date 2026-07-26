import { beforeEach, describe, expect, it } from "vitest";

import { useDashboardStore } from "./dashboard-store";

describe("dashboard store", () => {
  beforeEach(() => {
    useDashboardStore.getState().resetDashboard();
  });

  it("updates search and filter state", () => {
    useDashboardStore.getState().setSearchQuery("164");
    useDashboardStore.getState().setHouseFilter("PENDING_FINE");

    expect(useDashboardStore.getState()).toMatchObject({
      houseFilter: "PENDING_FINE",
      searchQuery: "164",
    });
  });

  it("toggles the sidebar", () => {
    useDashboardStore.getState().toggleSidebar();

    expect(useDashboardStore.getState().sidebarCollapsed).toBe(true);
  });

  it("resets all dashboard state", () => {
    useDashboardStore.getState().setSearchQuery("164");
    useDashboardStore.getState().setHouseFilter("INACTIVE");
    useDashboardStore.getState().toggleSidebar();

    useDashboardStore.getState().resetDashboard();

    expect(useDashboardStore.getState()).toMatchObject({
      houseFilter: "ALL",
      searchQuery: "",
      sidebarCollapsed: false,
    });
  });
});
