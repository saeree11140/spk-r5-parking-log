import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { makeViolation } from "@/test/fixtures";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

import { CancelViolationModal } from "./cancel-violation-modal";

afterEach(() => {
  vi.restoreAllMocks();
});

const violation = makeViolation({
  id: "400815ca-caf9-4106-86f2-99895fa014fe",
  sequenceNumber: 3,
});

describe("CancelViolationModal", () => {
  it("shows recalculation warning and validates a trimmed reason", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CancelViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    expect(
      screen.getByText(
        "ระบบจะเก็บประวัติการยกเลิกและคำนวณลำดับกับค่าปรับใหม่",
      ),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("เหตุผลที่ยกเลิก"), "ผิด");
    await user.click(screen.getByRole("button", { name: "ยืนยันการยกเลิก" }));

    expect(
      await screen.findByText("เหตุผลต้องมี 5–500 ตัวอักษร"),
    ).toBeInTheDocument();
  });

  it("uses violation ID and invalidates both queries", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.houses, []);
    queryClient.setQueryData(queryKeys.house("R5-001"), {});
    vi.spyOn(parkingApi, "cancelViolation").mockResolvedValue({} as never);
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderWithQueryClient(
      <CancelViolationModal
        houseCode="R5-001"
        onClose={onClose}
        onSuccess={onSuccess}
        open
        violation={violation}
      />,
      { queryClient },
    );

    await user.type(
      screen.getByLabelText("เหตุผลที่ยกเลิก"),
      "  บันทึกผิดบ้าน  ",
    );
    await user.click(screen.getByRole("button", { name: "ยืนยันการยกเลิก" }));

    await waitFor(() =>
      expect(parkingApi.cancelViolation).toHaveBeenCalledWith(
        "R5-001",
        "400815ca-caf9-4106-86f2-99895fa014fe",
        { reason: "บันทึกผิดบ้าน" },
      ),
    );
    expect(queryClient.getQueryState(queryKeys.houses)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(queryKeys.house("R5-001"))?.isInvalidated,
    ).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith("ยกเลิก Violation แล้ว");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("translates concurrent modification and keeps the modal open", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "cancelViolation").mockRejectedValue(
      new ApiError(
        "Concurrent modification",
        "CONCURRENT_MODIFICATION",
        409,
      ),
    );
    renderWithQueryClient(
      <CancelViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    await user.type(
      screen.getByLabelText("เหตุผลที่ยกเลิก"),
      "บันทึกผิดบ้าน",
    );
    await user.click(screen.getByRole("button", { name: "ยืนยันการยกเลิก" }));

    expect(
      await screen.findByText("ข้อมูลมีการเปลี่ยนแปลง กรุณาลองใหม่"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
