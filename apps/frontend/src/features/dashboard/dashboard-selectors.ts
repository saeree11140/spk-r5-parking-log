import type { HouseSummary } from "@spk-r5-parking-log/shared-types";

import type { HouseFilter } from "@/stores/dashboard-store";

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

export function getCurrentActivity(house: HouseSummary): CurrentActivity {
  return house.currentCycles.reduce<CurrentActivity>(
    (total, cycle) => ({
      pendingAmountBaht: total.pendingAmountBaht + cycle.pendingAmountBaht,
      pendingFineCount: total.pendingFineCount + cycle.pendingFineCount,
      violationCount: total.violationCount + cycle.violationCount,
    }),
    { pendingAmountBaht: 0, pendingFineCount: 0, violationCount: 0 },
  );
}

export function getDashboardMetrics(houses: HouseSummary[]): DashboardMetrics {
  return houses.reduce<DashboardMetrics>(
    (metrics, house) => {
      const activity = getCurrentActivity(house);

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

function matchesFilter(house: HouseSummary, filter: HouseFilter): boolean {
  switch (filter) {
    case "ACTIVE_VIOLATIONS":
      return getCurrentActivity(house).violationCount > 0;
    case "PENDING_FINE":
      return getCurrentActivity(house).pendingFineCount > 0;
    case "NO_CURRENT_ACTIVITY":
      return house.currentCycles.length === 0;
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

      return matchesSearch && matchesFilter(house, filter);
    })
    .sort((left, right) => left.sequenceNumber - right.sequenceNumber);
}
