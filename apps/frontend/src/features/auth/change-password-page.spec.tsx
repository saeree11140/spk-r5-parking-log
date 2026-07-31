import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/lib/api/auth-api";
import { makeAuthUser } from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { ChangePasswordPage } from "./change-password-page";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));
vi.mock("@/lib/api/auth-api", () => ({
  authApi: { changePassword: vi.fn() },
}));

describe("ChangePasswordPage", () => {
  afterEach(() => {
    replace.mockReset();
    vi.mocked(authApi.changePassword).mockReset();
  });

  it("updates the current user and opens the app after password change", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.changePassword).mockResolvedValue(
      makeAuthUser({ mustChangePassword: false }),
    );

    renderWithQueryClient(<ChangePasswordPage />);
    await user.type(
      screen.getByLabelText("รหัสผ่านปัจจุบัน"),
      "CurrentPassword123",
    );
    await user.type(screen.getByLabelText("รหัสผ่านใหม่"), "NewPassword1234");
    await user.type(
      screen.getByLabelText("ยืนยันรหัสผ่านใหม่"),
      "NewPassword1234",
    );
    await user.click(screen.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" }));

    expect(authApi.changePassword).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
