import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import {
  makeCycle,
  makeHouseDetail,
  makeViolation,
} from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { HouseDetailPage } from "./house-detail-page";

afterEach(() => {
  vi.restoreAllMocks();
});

const pendingFine = {
  amountBaht: 1_000,
  id: "fine-pending",
  paidAt: null,
  reference: null,
  status: "PENDING" as const,
};

const house = makeHouseDetail({
  cycles: [
    makeCycle({
      closedAt: "2026-06-10T03:00:00.000Z",
      cycleNumber: 1,
      id: "cycle-001",
      status: "CLOSED",
      violationCount: 1,
      violations: [
        makeViolation({
          fine: {
            amountBaht: 1_000,
            id: "fine-paid",
            paidAt: "2026-06-10T03:00:00.000Z",
            reference: "receipt-001",
            status: "PAID",
          },
          id: "violation-old",
          sequenceNumber: 3,
          status: "PAID",
        }),
      ],
    }),
    makeCycle({
      cycleNumber: 2,
      id: "cycle-002",
      pendingAmountBaht: 1_000,
      pendingFineCount: 1,
      totalFineAmountBaht: 1_000,
      violationCount: 3,
      violations: [
        makeViolation({
          id: "violation-two",
          sequenceNumber: 2,
        }),
        makeViolation({
          cancellationReason: "บันทึกผิดบ้าน",
          cancelledAt: "2026-07-02T03:00:00.000Z",
          id: "violation-cancelled",
          sequenceNumber: null,
          status: "CANCELLED",
        }),
        makeViolation({
          id: "violation-one",
          sequenceNumber: 1,
        }),
        makeViolation({
          fine: pendingFine,
          id: "violation-three",
          sequenceNumber: 3,
          status: "PENDING_FINE",
        }),
      ],
    }),
  ],
});

describe("HouseDetailPage", () => {
  it("shows loading, then an empty history explanation", async () => {
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(
      makeHouseDetail({ cycles: [] }),
    );

    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);

    expect(
      screen.getByRole("status", { name: "กำลังโหลดรายละเอียดบ้าน" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("ยังไม่มีประวัติ Violation")).toBeInTheDocument();
  });

  it("shows a safe error and retries", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouse")
      .mockRejectedValueOnce(
        new ApiError(
          "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
          "NETWORK_ERROR",
          null,
        ),
      )
      .mockResolvedValueOnce(house);

    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    expect(
      await screen.findByText("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(await screen.findByRole("heading", { name: "R5-001" })).toBeInTheDocument();
    expect(parkingApi.getHouse).toHaveBeenCalledTimes(2);
  });

  it("renders breadcrumb, current summary and newest cycles first", async () => {
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(house);

    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    expect(await screen.findByRole("heading", { name: "R5-001" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "ภาพรวม" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Cycle ปัจจุบัน")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "สรุปบ้าน" })).getByText(
        "฿1,000",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["ประวัติ Cycle", "Cycle 2", "Cycle 1"]);
  });

  it("orders active violations by sequence and cancelled records last", async () => {
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(house);
    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);

    const cycle = await screen.findByRole("region", { name: "Cycle 2" });
    const rows = within(cycle).getAllByRole("row").slice(1);

    expect(rows.map((row) => row.dataset.violationId)).toEqual([
      "violation-one",
      "violation-two",
      "violation-three",
      "violation-cancelled",
    ]);
    expect(within(cycle).getByText(/บันทึกผิดบ้าน/)).toBeInTheDocument();
  });

  it("shows payment details and only valid row actions", async () => {
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(house);
    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    await screen.findByRole("heading", { name: "R5-001" });

    expect(screen.getByText("receipt-001")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "บันทึกชำระ Violation ครั้งที่ 3",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "ยกเลิก Violation ครั้งที่ 3",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "ยกเลิก Violation ครั้งที่ 1",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "ยกเลิก Violation ครั้งที่ null",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "แก้ไข Violation ครั้งที่ 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "แก้ไข Violation ครั้งที่ 3" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "แก้ไข Violation ครั้งที่ null",
      }),
    ).not.toBeInTheDocument();
    const firstViolationRow = screen
      .getByRole("button", { name: "แก้ไข Violation ครั้งที่ 1" })
      .closest("tr");
    expect(
      within(firstViolationRow as HTMLTableRowElement)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "แก้ไข Violation ครั้งที่ 1",
      "ยกเลิก Violation ครั้งที่ 1",
    ]);
  });

  it("hides edit and cancel actions for cancelled, closed, or paid cycles", async () => {
    const paidCycleHouse = makeHouseDetail({
      cycles: [
        makeCycle({
          cycleNumber: 2,
          paidFineCount: 1,
          violations: [
            makeViolation({ id: "warning", sequenceNumber: 1 }),
            makeViolation({
              id: "cancelled",
              sequenceNumber: null,
              status: "CANCELLED",
            }),
            makeViolation({
              fine: {
                amountBaht: 1_000,
                id: "paid",
                paidAt: "2026-07-02T03:00:00.000Z",
                reference: null,
                status: "PAID",
              },
              id: "paid-violation",
              sequenceNumber: 3,
              status: "PAID",
            }),
          ],
        }),
        makeCycle({
          closedAt: "2026-07-03T03:00:00.000Z",
          cycleNumber: 1,
          status: "CLOSED",
          violations: [makeViolation({ id: "closed", sequenceNumber: 2 })],
        }),
      ],
    });
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(paidCycleHouse);

    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    await screen.findByRole("heading", { name: "R5-001" });

    expect(
      screen.queryByRole("button", { name: /ยกเลิก Violation/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /แก้ไข Violation/ }),
    ).not.toBeInTheDocument();
  });

  it("refreshes only when requested", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(house);
    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    await screen.findByRole("heading", { name: "R5-001" });

    await user.click(
      screen.getByRole("button", { name: "รีเฟรชรายละเอียดบ้าน" }),
    );

    expect(parkingApi.getHouse).toHaveBeenCalledTimes(2);
  });

  it("opens the selected create, edit, cancel and mark-paid dialogs", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "getHouse").mockResolvedValue(house);
    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    await screen.findByRole("heading", { name: "R5-001" });

    await user.click(screen.getByRole("button", { name: "เพิ่ม Violation" }));
    expect(
      screen.getByRole("dialog", { name: "เพิ่ม Violation" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ปิด" }));

    await user.click(
      screen.getByRole("button", { name: "แก้ไข Violation ครั้งที่ 2" }),
    );
    expect(
      screen.getByRole("dialog", { name: "แก้ไข Violation" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("วันเวลาเกิดเหตุ")).toHaveValue(
      "2026-07-01T10:00",
    );
    expect(screen.getByLabelText("หมายเหตุ")).toHaveValue("ทดสอบ");
    await user.click(screen.getByRole("button", { name: "ปิด" }));

    await user.click(
      screen.getByRole("button", { name: "ยกเลิก Violation ครั้งที่ 2" }),
    );
    expect(
      screen.getByRole("dialog", { name: "ยกเลิก Violation ครั้งที่ 2" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ปิด" }));

    await user.click(
      screen.getByRole("button", {
        name: "บันทึกชำระ Violation ครั้งที่ 3",
      }),
    );
    expect(
      screen.getByRole("dialog", {
        name: "บันทึกชำระ Fine ครั้งที่ 3",
      }),
    ).toBeInTheDocument();
  });

  it("refetches and renders the reordered note and fine state after editing", async () => {
    const user = userEvent.setup();
    const updatedHouse = makeHouseDetail({
      ...house,
      cycles: [
        house.cycles[0]!,
        makeCycle({
          ...house.cycles[1],
          violations: [
            makeViolation({
              fine: { ...pendingFine, amountBaht: 0, status: "CANCELLED" },
              id: "violation-three",
              note: "แก้ลำดับแล้ว",
              occurredAt: "2026-06-30T02:00:00.000Z",
              sequenceNumber: 1,
              status: "WARNING",
            }),
            makeViolation({
              id: "violation-one",
              sequenceNumber: 2,
            }),
            makeViolation({
              fine: { ...pendingFine, id: "fine-resequenced" },
              id: "violation-two",
              sequenceNumber: 3,
              status: "PENDING_FINE",
            }),
            makeViolation({
              cancellationReason: "บันทึกผิดบ้าน",
              cancelledAt: "2026-07-02T03:00:00.000Z",
              id: "violation-cancelled",
              sequenceNumber: null,
              status: "CANCELLED",
            }),
          ],
        }),
      ],
    });
    vi.spyOn(parkingApi, "getHouse")
      .mockResolvedValueOnce(house)
      .mockResolvedValueOnce(updatedHouse);
    vi.spyOn(parkingApi, "updateViolation").mockResolvedValue({} as never);
    renderWithQueryClient(<HouseDetailPage houseCode="R5-001" />);
    await screen.findByRole("heading", { name: "R5-001" });

    await user.click(
      screen.getByRole("button", { name: "แก้ไข Violation ครั้งที่ 3" }),
    );
    const occurredAtInput = screen.getByLabelText("วันเวลาเกิดเหตุ");
    await user.clear(occurredAtInput);
    await user.type(occurredAtInput, "2026-06-30T09:00");
    const noteInput = screen.getByLabelText("หมายเหตุ");
    await user.clear(noteInput);
    await user.type(noteInput, "แก้ลำดับแล้ว");
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(await screen.findByText("แก้ไข Violation แล้ว")).toBeInTheDocument();
    await waitFor(() =>
      expect(parkingApi.updateViolation).toHaveBeenCalledWith(
        "R5-001",
        "violation-three",
        {
          note: "แก้ลำดับแล้ว",
          occurredAt: "2026-06-30T02:00:00.000Z",
        },
      ),
    );
    expect(parkingApi.getHouse).toHaveBeenCalledTimes(2);

    const cycle = screen.getByRole("region", { name: "Cycle 2" });
    const rows = within(cycle).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.dataset.violationId)).toEqual([
      "violation-three",
      "violation-one",
      "violation-two",
      "violation-cancelled",
    ]);
    expect(within(rows[0]!).getByText("แก้ลำดับแล้ว")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("แจ้งเตือน")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("฿0")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("รอชำระ Fine")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("฿1,000")).toBeInTheDocument();
  });
});
