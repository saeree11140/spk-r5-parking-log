import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { makeViolation } from "@/test/fixtures";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

import { EditViolationModal } from "./edit-violation-modal";

const originalTimeZone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "UTC";
});

afterAll(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const violation = makeViolation({
  id: "400815ca-caf9-4106-86f2-99895fa014fe",
  note: "จอดกีดขวาง",
  occurredAt: "2026-07-01T03:00:00.000Z",
  sequenceNumber: 2,
});

describe("EditViolationModal", () => {
  it("prefills the selected violation date, time and note", () => {
    renderWithQueryClient(
      <EditViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    expect(screen.getByLabelText("วันเวลาเกิดเหตุ")).toHaveValue(
      "01/07/2569 10:00",
    );
    expect(screen.getByLabelText("หมายเหตุ")).toHaveValue("จอดกีดขวาง");
  });

  it("submits changed ISO time and a trimmed note, then refreshes and closes", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.houses, []);
    queryClient.setQueryData(queryKeys.house("R5-001"), {});
    vi.spyOn(parkingApi, "updateViolation").mockResolvedValue({} as never);
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderWithQueryClient(
      <EditViolationModal
        houseCode="R5-001"
        onClose={onClose}
        onSuccess={onSuccess}
        open
        violation={violation}
      />,
      { queryClient },
    );

    const occurredAt = screen.getByLabelText("วันเวลาเกิดเหตุ");
    await user.clear(occurredAt);
    await user.type(occurredAt, "020725691130");
    const note = screen.getByLabelText("หมายเหตุ");
    await user.clear(note);
    await user.type(note, "  แก้ไขรายละเอียด  ");
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    await waitFor(() =>
      expect(parkingApi.updateViolation).toHaveBeenCalledWith(
        "R5-001",
        "400815ca-caf9-4106-86f2-99895fa014fe",
        {
          note: "แก้ไขรายละเอียด",
          occurredAt: "2026-07-02T04:30:00.000Z",
        },
      ),
    );
    expect(queryClient.getQueryState(queryKeys.houses)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(queryKeys.house("R5-001"))?.isInvalidated,
    ).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith("แก้ไข Violation แล้ว");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("sends null when the note is cleared", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "updateViolation").mockResolvedValue({} as never);
    renderWithQueryClient(
      <EditViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    await user.clear(screen.getByLabelText("หมายเหตุ"));
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    await waitFor(() =>
      expect(parkingApi.updateViolation).toHaveBeenCalledWith(
        "R5-001",
        "400815ca-caf9-4106-86f2-99895fa014fe",
        {
          note: null,
          occurredAt: "2026-07-01T03:00:00.000Z",
        },
      ),
    );
  });

  it("preserves the exact original instant when only the note changes", async () => {
    const user = userEvent.setup();
    const preciseViolation = makeViolation({
      ...violation,
      occurredAt: "2026-07-01T03:00:45.123Z",
    });
    vi.spyOn(parkingApi, "updateViolation").mockResolvedValue({} as never);
    renderWithQueryClient(
      <EditViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
        violation={preciseViolation}
      />,
    );

    const note = screen.getByLabelText("หมายเหตุ");
    await user.clear(note);
    await user.type(note, "แก้เฉพาะหมายเหตุ");
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    await waitFor(() =>
      expect(parkingApi.updateViolation).toHaveBeenCalledWith(
        "R5-001",
        "400815ca-caf9-4106-86f2-99895fa014fe",
        {
          note: "แก้เฉพาะหมายเหตุ",
          occurredAt: "2026-07-01T03:00:45.123Z",
        },
      ),
    );
  });

  it("keeps API errors visible without closing", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "updateViolation").mockRejectedValue(
      new ApiError("Violation นี้แก้ไขไม่ได้", "VIOLATION_NOT_EDITABLE", 409),
    );
    const onClose = vi.fn();
    renderWithQueryClient(
      <EditViolationModal
        houseCode="R5-001"
        onClose={onClose}
        onSuccess={() => undefined}
        open
        violation={violation}
      />,
    );

    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(
      await screen.findByText("Violation นี้แก้ไขไม่ได้"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "แก้ไข Violation" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
