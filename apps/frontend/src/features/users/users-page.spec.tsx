import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usersApi } from "@/lib/api/users-api";
import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { UsersPage } from "./users-page";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));
vi.mock("@/lib/api/users-api", () => ({
  usersApi: {
    create: vi.fn(),
    list: vi.fn(),
    resetPassword: vi.fn(),
    update: vi.fn(),
  },
}));

describe("UsersPage", () => {
  afterEach(() => {
    replace.mockReset();
    vi.clearAllMocks();
    useAuthStore.getState().setChecking();
  });

  it("lists status, role and forced-change state", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser(),
    });
    vi.mocked(usersApi.list).mockResolvedValue([
      {
        ...makeAuthUser({
          displayName: "เจ้าหน้าที่หนึ่ง",
          id: "user-2",
          mustChangePassword: true,
          role: "STAFF",
          username: "staff.one",
        }),
        createdAt: "2026-08-01T00:00:00.000Z",
        lockedUntil: null,
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);

    renderWithQueryClient(<UsersPage />);

    expect(await screen.findByText("staff.one")).toBeInTheDocument();
    expect(screen.getByText("STAFF")).toBeInTheDocument();
    expect(screen.getByText("รอเปลี่ยนรหัสผ่าน")).toBeInTheDocument();
  });

  it("does not offer deactivate for current admin", async () => {
    const admin = {
      ...makeAuthUser(),
      createdAt: "2026-08-01T00:00:00.000Z",
      lockedUntil: null,
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
    useAuthStore.setState({ status: "authenticated", user: admin });
    vi.mocked(usersApi.list).mockResolvedValue([admin]);

    renderWithQueryClient(<UsersPage />);

    await screen.findByText(admin.username);
    expect(
      screen.queryByRole("button", {
        name: `ปิดบัญชี ${admin.username}`,
      }),
    ).not.toBeInTheDocument();
  });

  it("redirects STAFF without requesting user data", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    renderWithQueryClient(<UsersPage />);

    expect(replace).toHaveBeenCalledWith("/");
    expect(usersApi.list).not.toHaveBeenCalled();
  });
});
