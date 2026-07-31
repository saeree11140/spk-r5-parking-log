import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usersApi } from "@/lib/api/users-api";
import { userKeys } from "@/lib/query/keys";
import { makeAuthUser } from "@/test/fixtures";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

import { CreateUserModal } from "./create-user-modal";
import { ResetPasswordModal } from "./reset-password-modal";

vi.mock("@/lib/api/users-api", () => ({
  usersApi: {
    create: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe("user modals", () => {
  afterEach(() => vi.clearAllMocks());

  it("invalidates user query after create", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    vi.mocked(usersApi.create).mockResolvedValue({
      ...makeAuthUser({ id: "user-2", role: "STAFF" }),
      createdAt: "2026-08-01T00:00:00.000Z",
      lockedUntil: null,
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    renderWithQueryClient(<CreateUserModal onClose={vi.fn()} open />, {
      queryClient,
    });
    await user.type(screen.getByLabelText("ชื่อผู้ใช้"), "staff.one");
    await user.type(screen.getByLabelText("ชื่อที่แสดง"), "เจ้าหน้าที่หนึ่ง");
    await user.type(
      screen.getByLabelText("รหัสผ่านชั่วคราว"),
      "StrongPassword123",
    );
    await user.click(screen.getByRole("button", { name: "สร้างผู้ใช้" }));

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: userKeys.all,
    });
  });

  it("uses a password input when resetting a password", () => {
    renderWithQueryClient(
      <ResetPasswordModal
        onClose={vi.fn()}
        open
        target={{
          ...makeAuthUser({ id: "user-2", username: "staff.one" }),
          createdAt: "2026-08-01T00:00:00.000Z",
          lockedUntil: null,
          updatedAt: "2026-08-01T00:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByLabelText("รหัสผ่านชั่วคราว")).toHaveAttribute(
      "type",
      "password",
    );
  });
});
