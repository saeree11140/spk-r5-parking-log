import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { makeViolation } from "@/test/fixtures";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

import { MarkFinePaidModal } from "./mark-fine-paid-modal";

process.env.TZ = "Asia/Bangkok";

afterEach(() => {
  vi.restoreAllMocks();
});

const violation = makeViolation({
  fine: {
    amountBaht: 1_000,
    id: "fine-001",
    paidAt: null,
    reference: null,
    status: "PENDING",
  },
  id: "400815ca-caf9-4106-86f2-99895fa014fe",
  occurredAt: "2026-07-01T03:00:00.000Z",
  sequenceNumber: 3,
  status: "PENDING_FINE",
});

describe("MarkFinePaidModal", () => {
  it("has no amount field and rejects payment before violation", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <MarkFinePaidModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    expect(
      screen.getByText("เมื่อบันทึกว่าชำระแล้ว จะย้อนกลับไม่ได้ในระบบนี้"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("จำนวนเงิน")).not.toBeInTheDocument();
    const paidAt = screen.getByLabelText("วันเวลาชำระ");
    await user.clear(paidAt);
    await user.type(paidAt, "010725690959");
    await user.click(screen.getByRole("button", { name: "ยืนยันว่าชำระแล้ว" }));

    expect(
      await screen.findByText("เวลาชำระต้องไม่ก่อนเวลาเกิดเหตุ"),
    ).toBeInTheDocument();
  });

  it("submits ISO time without amount and invalidates both queries", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.houses, []);
    queryClient.setQueryData(queryKeys.house("R5-001"), {});
    vi.spyOn(parkingApi, "markFinePaid").mockResolvedValue({} as never);
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderWithQueryClient(
      <MarkFinePaidModal
        houseCode="R5-001"
        onClose={onClose}
        onSuccess={onSuccess}
        open
        violation={violation}
      />,
      { queryClient },
    );

    const paidAt = screen.getByLabelText("วันเวลาชำระ");
    await user.clear(paidAt);
    await user.type(paidAt, "010725691000");
    await user.type(screen.getByLabelText("เลขอ้างอิง"), "  receipt-001  ");
    await user.click(screen.getByRole("button", { name: "ยืนยันว่าชำระแล้ว" }));

    await waitFor(() =>
      expect(parkingApi.markFinePaid).toHaveBeenCalledWith(
        "R5-001",
        "400815ca-caf9-4106-86f2-99895fa014fe",
        {
          paidAt: "2026-07-01T03:00:00.000Z",
          reference: "receipt-001",
        },
      ),
    );
    const submitted = vi.mocked(parkingApi.markFinePaid).mock.calls[0][2];
    expect(submitted).not.toHaveProperty("amountBaht");
    expect(queryClient.getQueryState(queryKeys.houses)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(queryKeys.house("R5-001"))?.isInvalidated,
    ).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith("บันทึกการชำระแล้ว");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the modal open after a domain error", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "markFinePaid").mockRejectedValue(
      new ApiError("Fine ถูกชำระแล้ว", "FINE_ALREADY_PAID", 409),
    );
    renderWithQueryClient(
      <MarkFinePaidModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    const paidAt = screen.getByLabelText("วันเวลาชำระ");
    await user.clear(paidAt);
    await user.type(paidAt, "010725691000");
    await user.click(screen.getByRole("button", { name: "ยืนยันว่าชำระแล้ว" }));

    expect(await screen.findByText("Fine ถูกชำระแล้ว")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
