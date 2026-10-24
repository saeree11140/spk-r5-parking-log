import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/api-error";
import { authApi } from "@/lib/api/auth-api";
import { parkingApi } from "@/lib/api/parking-api";
import { usersApi } from "@/lib/api/users-api";
import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";
import { renderApp } from "@/test/render";

vi.mock("@/lib/api/auth-api", () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
}));
vi.mock("@/lib/api/parking-api", () => ({
  parkingApi: {
    getHouses: vi.fn().mockResolvedValue([]),
    getHouse: vi.fn(),
    getViolationCategories: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/lib/api/users-api", () => ({
  usersApi: { list: vi.fn().mockResolvedValue([]) },
}));

const signedOut = () =>
  new ApiError("Authentication required", "AUTH_REQUIRED", 401);

async function expectPath(
  router: { state: { location: { pathname: string } } },
  pathname: string,
) {
  await waitFor(() => expect(router.state.location.pathname).toBe(pathname));
}

describe("application routing", () => {
  afterEach(() => {
    // Unmount first: a mounted router would react to the store reset below.
    cleanup();
    vi.mocked(authApi.me).mockReset();
    vi.mocked(parkingApi.getHouses).mockClear();
    vi.mocked(usersApi.list).mockClear();
    useAuthStore.getState().setChecking();
  });

  it("sends a signed-out visitor to login without loading protected data", async () => {
    vi.mocked(authApi.me).mockRejectedValue(signedOut());

    const { router } = await renderApp("/");

    await expectPath(router, "/login");
    expect(await screen.findByLabelText("ชื่อผู้ใช้")).toBeInTheDocument();
    expect(parkingApi.getHouses).not.toHaveBeenCalled();
  });

  it("keeps a forced-change user on change-password", async () => {
    vi.mocked(authApi.me).mockResolvedValue(
      makeAuthUser({ mustChangePassword: true }),
    );

    const { router } = await renderApp("/houses");

    await expectPath(router, "/change-password");
    expect(parkingApi.getHouses).not.toHaveBeenCalled();
  });

  it("sends a signed-in user away from login and change-password", async () => {
    vi.mocked(authApi.me).mockResolvedValue(makeAuthUser());

    const login = await renderApp("/login");
    await expectPath(login.router, "/");
    login.unmount();

    const changePassword = await renderApp("/change-password");
    await expectPath(changePassword.router, "/");
  });

  it("keeps STAFF out of user management", async () => {
    vi.mocked(authApi.me).mockResolvedValue(makeAuthUser({ role: "STAFF" }));

    const { router } = await renderApp("/users");

    await expectPath(router, "/");
    expect(usersApi.list).not.toHaveBeenCalled();
  });

  it("lets ADMIN open user management", async () => {
    vi.mocked(authApi.me).mockResolvedValue(makeAuthUser({ role: "ADMIN" }));

    const { router } = await renderApp("/users");

    await waitFor(() => expect(usersApi.list).toHaveBeenCalled());
    expect(router.state.location.pathname).toBe("/users");
  });

  it("returns to login when the session expires", async () => {
    vi.mocked(authApi.me).mockResolvedValue(makeAuthUser());
    const { router } = await renderApp("/");
    await screen.findByText(makeAuthUser().displayName);

    act(() => useAuthStore.getState().setUnauthenticated());

    await expectPath(router, "/login");
  });

  it("re-checks the session when the page is restored from the back-forward cache", async () => {
    vi.mocked(authApi.me).mockResolvedValue(
      makeAuthUser({ displayName: "local.001" }),
    );
    const { router } = await renderApp("/");
    await screen.findByText("local.001");
    vi.mocked(authApi.me).mockRejectedValue(signedOut());

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });

    expect(screen.queryByText("local.001")).not.toBeInTheDocument();
    await expectPath(router, "/login");
  });
});
