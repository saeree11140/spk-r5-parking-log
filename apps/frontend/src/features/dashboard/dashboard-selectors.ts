import type { HouseSummary } from "@spk-r5-parking-log/shared-types";

import type { HouseFilter } from "@/stores/dashboard-store";

export interface DashboardMetrics {
  activeViolationHouseCount: number;
  pendingAmountBaht: number;
  pendingFineCount: number;
  totalHouses: number;
}

export function getDashboardMetrics(
  houses: HouseSummary[],
): DashboardMetrics {
  return houses.reduce<DashboardMetrics>(
    (metrics, house) => ({
      activeViolationHouseCount:
        metrics.activeViolationHouseCount +
        (house.currentCycle && house.currentCycle.violationCount > 0 ? 1 : 0),
      pendingAmountBaht:
        metrics.pendingAmountBaht +
        (house.currentCycle?.pendingAmountBaht ?? 0),
      pendingFineCount:
        metrics.pendingFineCount +
        (house.currentCycle?.pendingFineCount ?? 0),
      totalHouses: metrics.totalHouses + 1,
    }),
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
      return (house.currentCycle?.violationCount ?? 0) > 0;
    case "PENDING_FINE":
      return (house.currentCycle?.pendingFineCount ?? 0) > 0;
    case "NO_CURRENT_ACTIVITY":
      return house.currentCycle === null;
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
