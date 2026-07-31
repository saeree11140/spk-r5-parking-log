import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { authApi } from "@/lib/api/auth-api";
import { renderWithQueryClient } from "@/test/render";

import { LoginPage } from "./login-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/lib/api/auth-api", () => ({
  authApi: { login: vi.fn() },
}));

describe("LoginPage", () => {
  afterEach(() => vi.mocked(authApi.login).mockReset());

  it("shows generic login error without leaking account state", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(
        "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        "AUTH_INVALID_CREDENTIALS",
        401,
      ),
    );

    renderWithQueryClient(<LoginPage />);
    await user.type(screen.getByLabelText("ชื่อผู้ใช้"), "admin");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "WrongPassword123");
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    );
  });
});
