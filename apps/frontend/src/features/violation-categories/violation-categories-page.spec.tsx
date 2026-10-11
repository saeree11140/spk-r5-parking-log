import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { PARKING_CATEGORY, PET_CATEGORY } from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { ViolationCategoriesPage } from "./violation-categories-page";

const RETIRED = { id: "category-old", isActive: false, name: "หมวดเก่า" };

beforeEach(() => {
  vi.spyOn(parkingApi, "getViolationCategories").mockResolvedValue([
    PARKING_CATEGORY,
    PET_CATEGORY,
    RETIRED,
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function row(name: string) {
  const cell = screen.getByText(name);
  const tableRow = cell.closest("tr");
  if (!tableRow) throw new Error(`No row for ${name}`);
  return within(tableRow);
}

describe("ViolationCategoriesPage", () => {
  it("lists every category with its status", async () => {
    renderWithQueryClient(<ViolationCategoriesPage />);

    expect(await screen.findByText("จอดรถผิดระเบียบ")).toBeInTheDocument();
    expect(row("จอดรถผิดระเบียบ").getByText("ใช้งาน")).toBeInTheDocument();
    expect(row("หมวดเก่า").getByText("ปิดใช้งาน")).toBeInTheDocument();
  });

  it("adds a category and reports success", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "createViolationCategory").mockResolvedValue({
      id: "category-noise",
      isActive: true,
      name: "เสียงดัง",
    });
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText("จอดรถผิดระเบียบ");

    await user.click(screen.getByRole("button", { name: "เพิ่มหมวด" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("ชื่อหมวด"), "  เสียงดัง ");
    await user.click(within(dialog).getByRole("button", { name: "บันทึก" }));

    await waitFor(() =>
      expect(parkingApi.createViolationCategory).toHaveBeenCalledWith({
        name: "เสียงดัง",
      }),
    );
    expect(await screen.findByText("เพิ่มหมวดแล้ว")).toBeInTheDocument();
  });

  it("validates the name before sending it", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(parkingApi, "createViolationCategory");
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText("จอดรถผิดระเบียบ");

    await user.click(screen.getByRole("button", { name: "เพิ่มหมวด" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "บันทึก",
      }),
    );

    expect(await screen.findByText("กรุณาระบุชื่อหมวด")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("explains a duplicate name and keeps the dialog open", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "createViolationCategory").mockRejectedValue(
      new ApiError(
        "Violation category name is already in use",
        "CATEGORY_NAME_TAKEN",
        409,
      ),
    );
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText("จอดรถผิดระเบียบ");

    await user.click(screen.getByRole("button", { name: "เพิ่มหมวด" }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("ชื่อหมวด"),
      "จอดรถผิดระเบียบ",
    );
    await user.click(within(dialog).getByRole("button", { name: "บันทึก" }));

    expect(
      await within(dialog).findByText("มีหมวดชื่อนี้อยู่แล้ว"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renames a category with the current name prefilled", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "renameViolationCategory").mockResolvedValue({
      ...PET_CATEGORY,
      name: "สัตว์เลี้ยง",
    });
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText(PET_CATEGORY.name);

    await user.click(
      row(PET_CATEGORY.name).getByRole("button", {
        name: `เปลี่ยนชื่อ ${PET_CATEGORY.name}`,
      }),
    );
    const input = within(screen.getByRole("dialog")).getByLabelText("ชื่อหมวด");
    expect(input).toHaveValue(PET_CATEGORY.name);
    await user.clear(input);
    await user.type(input, "สัตว์เลี้ยง");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "บันทึก",
      }),
    );

    await waitFor(() =>
      expect(parkingApi.renameViolationCategory).toHaveBeenCalledWith(
        PET_CATEGORY.id,
        { name: "สัตว์เลี้ยง" },
      ),
    );
  });

  it("asks for confirmation before deactivating", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "deactivateViolationCategory").mockResolvedValue({
      ...PARKING_CATEGORY,
      isActive: false,
    });
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText(PARKING_CATEGORY.name);

    await user.click(
      row(PARKING_CATEGORY.name).getByRole("button", {
        name: `ปิดใช้งาน ${PARKING_CATEGORY.name}`,
      }),
    );
    expect(parkingApi.deactivateViolationCategory).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "ปิดใช้งาน",
      }),
    );

    await waitFor(() =>
      expect(parkingApi.deactivateViolationCategory).toHaveBeenCalledWith(
        PARKING_CATEGORY.id,
      ),
    );
    expect(await screen.findByText("ปิดใช้งานหมวดแล้ว")).toBeInTheDocument();
  });

  it("clears a failed deactivation error when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "deactivateViolationCategory").mockRejectedValue(
      new ApiError("Network down", "NETWORK_ERROR", null),
    );
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText(PARKING_CATEGORY.name);

    await user.click(
      row(PARKING_CATEGORY.name).getByRole("button", {
        name: `ปิดใช้งาน ${PARKING_CATEGORY.name}`,
      }),
    );
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "ปิดใช้งาน" }));
    expect(await within(dialog).findByText("Network down")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Network down")).toBeNull();
  });

  it("reactivates an inactive category directly", async () => {
    const user = userEvent.setup();
    vi.spyOn(parkingApi, "activateViolationCategory").mockResolvedValue({
      ...RETIRED,
      isActive: true,
    });
    renderWithQueryClient(<ViolationCategoriesPage />);
    await screen.findByText(RETIRED.name);

    await user.click(
      row(RETIRED.name).getByRole("button", {
        name: `เปิดใช้งาน ${RETIRED.name}`,
      }),
    );

    await waitFor(() =>
      expect(parkingApi.activateViolationCategory).toHaveBeenCalledWith(
        RETIRED.id,
      ),
    );
  });
});
