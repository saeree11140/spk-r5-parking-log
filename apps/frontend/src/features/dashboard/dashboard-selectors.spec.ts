import { describe, expect, it } from "vitest";

import { makeHouseSummary } from "@/test/fixtures";

import { filterHouses, getDashboardMetrics } from "./dashboard-selectors";

const houses = [
  makeHouseSummary({
    actualHouseNumber: "99/2",
    code: "R5-002",
    currentCycle: {
      cycleNumber: 1,
      id: "cycle-002",
      pendingAmountBaht: 1_000,
      pendingFineCount: 1,
      violationCount: 3,
    },
    id: "house-002",
    sequenceNumber: 2,
  }),
  makeHouseSummary({
    actualHouseNumber: "99/1",
    code: "R5-001",
    currentCycle: null,
    id: "house-001",
    sequenceNumber: 1,
  }),
  makeHouseSummary({
    actualHouseNumber: "99/3",
    code: "R5-003",
    currentCycle: {
      cycleNumber: 1,
      id: "cycle-003",
      pendingAmountBaht: 500,
      pendingFineCount: 1,
      violationCount: 4,
    },
    id: "house-003",
    isActive: false,
    sequenceNumber: 3,
  }),
];

describe("getDashboardMetrics", () => {
  it("sums village KPI values from current cycles", () => {
    expect(getDashboardMetrics(houses)).toEqual({
      activeViolationHouseCount: 2,
      pendingAmountBaht: 1_500,
      pendingFineCount: 2,
      totalHouses: 3,
    });
  });
});

describe("filterHouses", () => {
  it("searches by house code or actual house number", () => {
    expect(filterHouses(houses, "r5-002", "ALL").map((house) => house.code)).toEqual([
      "R5-002",
    ]);
    expect(filterHouses(houses, "99/1", "ALL").map((house) => house.code)).toEqual([
      "R5-001",
    ]);
  });

  it.each([
    ["ACTIVE_VIOLATIONS", ["R5-002", "R5-003"]],
    ["PENDING_FINE", ["R5-002", "R5-003"]],
    ["NO_CURRENT_ACTIVITY", ["R5-001"]],
    ["INACTIVE", ["R5-003"]],
  ] as const)("applies the %s filter", (filter, expectedCodes) => {
    expect(filterHouses(houses, "", filter).map((house) => house.code)).toEqual(
      expectedCodes,
    );
  });

  it("always sorts results by house sequence number", () => {
    expect(filterHouses(houses, "", "ALL").map((house) => house.code)).toEqual([
      "R5-001",
      "R5-002",
      "R5-003",
    ]);
  });
});
