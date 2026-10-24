import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";
import { renderWithRouter } from "@/test/render";

import { AuthGate } from "./auth-gate";

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));

describe("AuthGate", () => {
  afterEach(() => {
    useAuthStore.getState().setChecking();
  });

  it("sends forced-change users only to change-password", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ mustChangePassword: true }),
    });

    const { router } = await renderWithRouter(
      <AuthGate>
        <div>protected</div>
      </AuthGate>,
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/change-password"),
    );
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders login without the protected shell when signed out", async () => {
    useAuthStore.getState().setUnauthenticated();

    const { router } = await renderWithRouter(
      <AuthGate>
        <div>login</div>
      </AuthGate>,
      { path: "/login" },
    );

    expect(screen.getByText("login")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });
});
