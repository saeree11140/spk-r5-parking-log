import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { useDashboardStore } from "@/stores/dashboard-store";
import { makeHouseSummary } from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { DashboardPage } from "./dashboard-page";

const houses = [
  makeHouseSummary({
    actualHouseNumber: "99/1",
    code: "R5-001",
    currentCycle: null,
    id: "house-001",
    sequenceNumber: 1,
  }),
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
    actualHouseNumber: "99/164",
    code: "R5-164",
    currentCycle: {
      cycleNumber: 1,
      id: "cycle-164",
      pendingAmountBaht: 500,
      pendingFineCount: 1,
      violationCount: 4,
    },
    id: "house-164",
    sequenceNumber: 164,
  }),
];

beforeEach(() => {
  useDashboardStore.getState().resetDashboard();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  it("preserves dashboard layout while houses are loading", () => {
    vi.spyOn(parkingApi, "getHouses").mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<DashboardPage />);

    expect(
      screen.getByRole("status", { name: "กำลังโหลด Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("กำลังโหลด KPI")).toHaveLength(4);
  });

  it("shows a safe network error and retries the query", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouses")
      .mockRejectedValueOnce(
        new ApiError(
          "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
          "NETWORK_ERROR",
          null,
        ),
      )
      .mockResolvedValueOnce(houses);

    renderWithQueryClient(<DashboardPage />);

    expect(
      await screen.findByText("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(await screen.findByText("R5-164")).toBeInTheDocument();
    expect(parkingApi.getHouses).toHaveBeenCalledTimes(2);
  });

  it("explains when the API has no houses", async () => {
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue([]);

    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText("ยังไม่มีข้อมูลบ้าน")).toBeInTheDocument();
  });

  it("renders KPI values and sorted house rows", async () => {
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue([
      houses[2],
      houses[0],
      houses[1],
    ]);

    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText("บ้านทั้งหมด")).toBeInTheDocument();
    expect(screen.getByText("ยอดรอชำระรวม")).toBeInTheDocument();
    expect(screen.getByText("฿1,500")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "ดูรายละเอียด" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/houses/R5-001",
      "/houses/R5-002",
      "/houses/R5-164",
    ]);
  });

  it("searches and filters houses through dashboard UI state", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue(houses);
    renderWithQueryClient(<DashboardPage />);
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
  });

  it("refreshes houses only when requested", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouses").mockResolvedValue(houses);
    renderWithQueryClient(<DashboardPage />);
    await screen.findByText("R5-164");

    await user.click(
      screen.getByRole("button", { name: "รีเฟรชข้อมูลบ้าน" }),
    );

    expect(parkingApi.getHouses).toHaveBeenCalledTimes(2);
  });
});
