import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { queryKeys } from "@/lib/query/keys";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

import { CreateViolationModal } from "./create-violation-modal";

process.env.TZ = "Asia/Bangkok";

const PARKING_ID = "5c0f3d0e-7b1a-4c55-9a51-2f3c1f0a0001";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-15T03:00:00.000Z"));
  vi.spyOn(parkingApi, "getViolationCategories").mockResolvedValue([
    { id: PARKING_ID, isActive: true, name: "จอดรถผิดระเบียบ" },
    { id: "category-pet", isActive: true, name: "สัตว์เลี้ยงขับถ่าย" },
    { id: "category-old", isActive: false, name: "หมวดที่เลิกใช้" },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CreateViolationModal", () => {
  it("requires a category and offers only active categories", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "createViolation").mockResolvedValue({} as never);
    renderWithQueryClient(
      <CreateViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
      />,
    );

    const select = await screen.findByLabelText("หมวด");
    await screen.findByRole("option", { name: "จอดรถผิดระเบียบ" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["เลือกหมวด", "จอดรถผิดระเบียบ", "สัตว์เลี้ยงขับถ่าย"]);
    expect(select).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(await screen.findByText("กรุณาเลือกหมวด")).toBeInTheDocument();
    expect(parkingApi.createViolation).not.toHaveBeenCalled();
  });

  it("lets the user retry loading categories", async () => {
    const user = userEvent.setup();
    vi.mocked(parkingApi.getViolationCategories)
      .mockReset()
      .mockRejectedValueOnce(new ApiError("ล้มเหลว", "INTERNAL_ERROR", 500))
      .mockResolvedValueOnce([
        { id: PARKING_ID, isActive: true, name: "จอดรถผิดระเบียบ" },
      ]);
    renderWithQueryClient(
      <CreateViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
      />,
    );

    expect(await screen.findByText("โหลดหมวดไม่สำเร็จ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(
      await screen.findByRole("option", { name: "จอดรถผิดระเบียบ" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("หมวด")).toBeEnabled();
  });

  it("explains a category deactivated meanwhile and reloads the list", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "createViolation").mockRejectedValue(
      new ApiError("Violation category is inactive", "CATEGORY_INACTIVE", 409),
    );
    renderWithQueryClient(
      <CreateViolationModal
        houseCode="R5-001"
        onClose={() => undefined}
        onSuccess={() => undefined}
        open
      />,
    );
    const select = await screen.findByLabelText("หมวด");
    await user.selectOptions(
      select,
      await screen.findByRole("option", { name: "จอดรถผิดระเบียบ" }),
    );
    vi.mocked(parkingApi.getViolationCategories).mockResolvedValue([
      { id: "category-pet", isActive: true, name: "สัตว์เลี้ยงขับถ่าย" },
    ]);

    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(
      await screen.findByText("หมวดนี้ถูกปิดใช้งานแล้ว กรุณาเลือกหมวดอื่น"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "จอดรถผิดระเบียบ" }),
      ).toBeNull(),
    );
    expect(select).toHaveValue("");
  });

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

    fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
      target: { value: "23:59:59" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "วันเวลาอยู่นอกช่วงที่กำหนด",
    );
    await user.type(screen.getByLabelText("หมายเหตุ"), "ก".repeat(1001));
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(
      await screen.findByText("หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร"),
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

    await user.click(
      screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }),
    );
    await user.click(screen.getByRole("button", { name: "เดือนก่อนหน้า" }));
    await user.click(
      screen.getByRole("button", { name: /ที่ 1 กรกฎาคม 2569$/ }),
    );
    fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
      target: { value: "10:00:45" },
    });
    await user.selectOptions(
      await screen.findByLabelText("หมวด"),
      await screen.findByRole("option", { name: "จอดรถผิดระเบียบ" }),
    );
    await user.type(screen.getByLabelText("หมายเหตุ"), "  จอดกีดขวาง  ");
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    await waitFor(() =>
      expect(parkingApi.createViolation).toHaveBeenCalledWith("R5-001", {
        categoryId: PARKING_ID,
        note: "จอดกีดขวาง",
        occurredAt: "2026-07-01T03:00:45.000Z",
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

    await user.selectOptions(
      await screen.findByLabelText("หมวด"),
      await screen.findByRole("option", { name: "จอดรถผิดระเบียบ" }),
    );
    await user.click(screen.getByRole("button", { name: "บันทึก Violation" }));

    expect(await screen.findByText("บ้านนี้ปิดใช้งาน")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
