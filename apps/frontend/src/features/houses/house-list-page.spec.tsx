import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parkingApi } from "@/lib/api/parking-api";
import { useDashboardStore } from "@/stores/dashboard-store";
import {
  makeCycleSummary,
  makeHouseSummary,
  PARKING_CATEGORY,
  PET_CATEGORY,
} from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { HouseListPage } from "./house-list-page";

const houses = [
  makeHouseSummary({
    actualHouseNumber: "99/1",
    code: "R5-001",
    currentCycles: [],
    id: "house-001",
    sequenceNumber: 1,
  }),
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
    actualHouseNumber: "99/164",
    code: "R5-164",
    currentCycles: [
      makeCycleSummary({
        cycleNumber: 1,
        fineRuleVersion: "V2",
        id: "cycle-164",
        pendingAmountBaht: 500,
        pendingFineCount: 1,
        violationCount: 4,
      }),
    ],
    id: "house-164",
    sequenceNumber: 164,
  }),
];

beforeEach(() => {
  useDashboardStore.getState().resetDashboard();
  vi.spyOn(parkingApi, "getViolationCategories").mockResolvedValue([
    PARKING_CATEGORY,
    PET_CATEGORY,
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HouseListPage", () => {
  it("renders sorted house links without dashboard KPI", async () => {
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue([
      houses[2],
      houses[0],
      houses[1],
    ]);

    renderWithQueryClient(<HouseListPage />);

    expect(
      screen.getByRole("heading", { name: "รายชื่อบ้าน" }),
    ).toBeInTheDocument();
    await screen.findByText("R5-164");
    expect(screen.queryByText("ยอดรอชำระรวม")).not.toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "ดูรายละเอียด" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/houses/R5-001",
      "/houses/R5-002",
      "/houses/R5-164",
    ]);
  });

  it("searches and filters houses through directory UI state", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue(houses);
    renderWithQueryClient(<HouseListPage />);
    await screen.findByText("R5-164");

    await user.type(
      screen.getByRole("searchbox", { name: "ค้นหาบ้าน" }),
      "164",
    );

    expect(screen.getByText("R5-164")).toBeInTheDocument();
    expect(screen.queryByText("R5-001")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "ค้นหาบ้าน" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "กรองสถานะบ้าน" }),
      "PENDING_FINE",
    );

    expect(screen.queryByText("R5-001")).not.toBeInTheDocument();
    expect(screen.getByText("R5-002")).toBeInTheDocument();
    expect(screen.getByText("R5-164")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "กรองหมวด" }),
      await screen.findByRole("option", { name: PET_CATEGORY.name }),
    );

    expect(screen.queryByText("R5-002")).not.toBeInTheDocument();
    expect(screen.getByText("ไม่พบบ้านตามเงื่อนไข")).toBeInTheDocument();
  });

  it("shows the selected category's totals in the table", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue([
      makeHouseSummary({
        code: "R5-020",
        currentCycles: [
          makeCycleSummary({ pendingAmountBaht: 1_000, pendingFineCount: 1 }),
          makeCycleSummary({
            category: PET_CATEGORY,
            id: "cycle-pet",
            pendingAmountBaht: 500,
            pendingFineCount: 1,
          }),
        ],
        id: "house-020",
        sequenceNumber: 20,
      }),
    ]);
    renderWithQueryClient(<HouseListPage />);
    expect(await screen.findByText("฿1,500")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "กรองหมวด" }),
      await screen.findByRole("option", { name: PET_CATEGORY.name }),
    );

    expect(await screen.findByText("฿500")).toBeInTheDocument();
  });
});
