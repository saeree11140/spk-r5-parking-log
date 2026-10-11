import type { HouseSummary } from "@spk-r5-parking-log/shared-types";

import {
  ALL_CATEGORIES,
  type CategoryFilter,
  type HouseFilter,
} from "@/stores/dashboard-store";

export interface DashboardMetrics {
  activeViolationHouseCount: number;
  pendingAmountBaht: number;
  pendingFineCount: number;
  totalHouses: number;
}

export interface CurrentActivity {
  pendingAmountBaht: number;
  pendingFineCount: number;
  violationCount: number;
}

function currentCyclesFor(house: HouseSummary, categoryFilter: CategoryFilter) {
  return categoryFilter === ALL_CATEGORIES
    ? house.currentCycles
    : house.currentCycles.filter(
        ({ category }) => category.id === categoryFilter,
      );
}

export function getCurrentActivity(
  house: HouseSummary,
  categoryFilter: CategoryFilter = ALL_CATEGORIES,
): CurrentActivity {
  return currentCyclesFor(house, categoryFilter).reduce<CurrentActivity>(
    (total, cycle) => ({
      pendingAmountBaht: total.pendingAmountBaht + cycle.pendingAmountBaht,
      pendingFineCount: total.pendingFineCount + cycle.pendingFineCount,
      violationCount: total.violationCount + cycle.violationCount,
    }),
    { pendingAmountBaht: 0, pendingFineCount: 0, violationCount: 0 },
  );
}

export function getDashboardMetrics(
  houses: HouseSummary[],
  categoryFilter: CategoryFilter = ALL_CATEGORIES,
): DashboardMetrics {
  return houses.reduce<DashboardMetrics>(
    (metrics, house) => {
      const activity = getCurrentActivity(house, categoryFilter);

      return {
        activeViolationHouseCount:
          metrics.activeViolationHouseCount +
          (activity.violationCount > 0 ? 1 : 0),
        pendingAmountBaht:
          metrics.pendingAmountBaht + activity.pendingAmountBaht,
        pendingFineCount: metrics.pendingFineCount + activity.pendingFineCount,
        totalHouses: metrics.totalHouses + 1,
      };
    },
    {
      activeViolationHouseCount: 0,
      pendingAmountBaht: 0,
      pendingFineCount: 0,
      totalHouses: 0,
    },
  );
}

function matchesFilter(
  house: HouseSummary,
  filter: HouseFilter,
  categoryFilter: CategoryFilter,
): boolean {
  switch (filter) {
    case "ACTIVE_VIOLATIONS":
      return getCurrentActivity(house, categoryFilter).violationCount > 0;
    case "PENDING_FINE":
      return getCurrentActivity(house, categoryFilter).pendingFineCount > 0;
    case "NO_CURRENT_ACTIVITY":
      return currentCyclesFor(house, categoryFilter).length === 0;
    case "INACTIVE":
      return !house.isActive;
    case "ALL":
      return true;
  }
}

export function filterHouses(
  houses: HouseSummary[],
  searchQuery: string,
  filter: HouseFilter,
  categoryFilter: CategoryFilter = ALL_CATEGORIES,
): HouseSummary[] {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("th");

  return houses
    .filter((house) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        house.code.toLocaleLowerCase("th").includes(normalizedSearch) ||
        (house.actualHouseNumber ?? "")
          .toLocaleLowerCase("th")
          .includes(normalizedSearch);

      return matchesSearch && matchesFilter(house, filter, categoryFilter);
    })
    .sort((left, right) => left.sequenceNumber - right.sequenceNumber);
}
