import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

import { CreateViolationModal } from "./create-violation-modal";

process.env.TZ = "Asia/Bangkok";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CreateViolationModal", () => {
  it("validates future time and an overlong note", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CreateViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
      />,
    );

    const occurredAt = screen.getByLabelText("วันเวลาเกิดเหตุ");
    await user.clear(occurredAt);
    await user.type(occurredAt, "010135421000");
    await user.type(screen.getByLabelText("หมายเหตุ"), "ก".repeat(1001));
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(
      await screen.findByText("วันเวลาต้องไม่อยู่ในอนาคต"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร"),
    ).toBeInTheDocument();
  });

  it("submits ISO time, invalidates both queries, closes and reports success", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.houses, []);
    queryClient.setQueryData(queryKeys.house("R5-001"), {});
    vi.spyOn(parkingApi, "createViolation").mockResolvedValue({} as never);
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderWithQueryClient(
      <CreateViolationModal
        houseCode="R5-001"
        onClose={onClose}
        onSuccess={onSuccess}
        open
      />,
      { queryClient },
    );

    const occurredAt = screen.getByLabelText("วันเวลาเกิดเหตุ");
    await user.clear(occurredAt);
    await user.type(occurredAt, "010725691000");
    await user.type(screen.getByLabelText("หมายเหตุ"), "  จอดกีดขวาง  ");
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    await waitFor(() =>
      expect(parkingApi.createViolation).toHaveBeenCalledWith("R5-001", {
        note: "จอดกีดขวาง",
        occurredAt: "2026-07-01T03:00:00.000Z",
      }),
    );
    expect(queryClient.getQueryState(queryKeys.houses)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(queryKeys.house("R5-001"))?.isInvalidated,
    ).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith("บันทึก Violation แล้ว");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the modal open and shows a backend domain error", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "createViolation").mockRejectedValue(
      new ApiError("บ้านนี้ปิดใช้งาน", "HOUSE_INACTIVE", 409),
    );
    const onClose = vi.fn();
    renderWithQueryClient(
      <CreateViolationModal
        houseCode="R5-001"
        onClose={onClose}
        onSuccess={() => undefined}
        open
      />,
    );

    const occurredAt = screen.getByLabelText("วันเวลาเกิดเหตุ");
    await user.clear(occurredAt);
    await user.type(occurredAt, "010725691000");
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(await screen.findByText("บ้านนี้ปิดใช้งาน")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
