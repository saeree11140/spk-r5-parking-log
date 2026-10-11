import { describe, expect, it } from "vitest";

import {
  makeCycleSummary,
  makeHouseSummary,
  PARKING_CATEGORY,
  PET_CATEGORY,
} from "@/test/fixtures";

import { filterHouses, getDashboardMetrics } from "./dashboard-selectors";

const houses = [
  makeHouseSummary({
    actualHouseNumber: "99/2",
    code: "R5-002",
    currentCycles: [
      makeCycleSummary({
        cycleNumber: 1,
        fineRuleVersion: "V2",
        id: "cycle-002",
        pendingAmountBaht: 1_000,
        pendingFineCount: 1,
        violationCount: 3,
      }),
    ],
    id: "house-002",
    sequenceNumber: 2,
  }),
  makeHouseSummary({
    actualHouseNumber: "99/1",
    code: "R5-001",
    currentCycles: [],
    id: "house-001",
    sequenceNumber: 1,
  }),
  makeHouseSummary({
    actualHouseNumber: "99/3",
    code: "R5-003",
    currentCycles: [
      makeCycleSummary({
        cycleNumber: 1,
        fineRuleVersion: "V2",
        id: "cycle-003",
        pendingAmountBaht: 500,
        pendingFineCount: 1,
        violationCount: 4,
      }),
    ],
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

describe("getDashboardMetrics with several categories", () => {
  it("adds every open category cycle of a house", () => {
    const house = makeHouseSummary({
      currentCycles: [
        makeCycleSummary({
          pendingAmountBaht: 1_000,
          pendingFineCount: 1,
          violationCount: 2,
        }),
        makeCycleSummary({
          category: PET_CATEGORY,
          id: "cycle-pet",
          pendingAmountBaht: 500,
          pendingFineCount: 1,
          violationCount: 3,
        }),
      ],
    });

    expect(getDashboardMetrics([house])).toEqual({
      activeViolationHouseCount: 1,
      pendingAmountBaht: 1_500,
      pendingFineCount: 2,
      totalHouses: 1,
    });
  });
});

describe("category filter", () => {
  const parkingOnly = makeHouseSummary({
    code: "R5-010",
    currentCycles: [
      makeCycleSummary({
        pendingAmountBaht: 1_000,
        pendingFineCount: 1,
        violationCount: 2,
      }),
    ],
    id: "house-010",
    sequenceNumber: 10,
  });
  const petOnly = makeHouseSummary({
    code: "R5-011",
    currentCycles: [
      makeCycleSummary({
        category: PET_CATEGORY,
        id: "cycle-pet",
        violationCount: 1,
      }),
    ],
    id: "house-011",
    sequenceNumber: 11,
  });

  it("counts only the selected category in the metrics", () => {
    expect(
      getDashboardMetrics([parkingOnly, petOnly], PET_CATEGORY.id),
    ).toEqual({
      activeViolationHouseCount: 1,
      pendingAmountBaht: 0,
      pendingFineCount: 0,
      totalHouses: 2,
    });
  });

  it("combines the category with the status filter", () => {
    expect(
      filterHouses(
        [parkingOnly, petOnly],
        "",
        "PENDING_FINE",
        PARKING_CATEGORY.id,
      ).map(({ code }) => code),
    ).toEqual(["R5-010"]);
    expect(
      filterHouses([parkingOnly, petOnly], "", "PENDING_FINE", PET_CATEGORY.id),
    ).toEqual([]);
  });

  it("treats a house without an open cycle in the category as inactive there", () => {
    expect(
      filterHouses(
        [parkingOnly, petOnly],
        "",
        "NO_CURRENT_ACTIVITY",
        PET_CATEGORY.id,
      ).map(({ code }) => code),
    ).toEqual(["R5-010"]);
  });
});

describe("filterHouses", () => {
  it("searches by house code or actual house number", () => {
    expect(
      filterHouses(houses, "r5-002", "ALL").map((house) => house.code),
    ).toEqual(["R5-002"]);
    expect(
      filterHouses(houses, "99/1", "ALL").map((house) => house.code),
    ).toEqual(["R5-001"]);
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
