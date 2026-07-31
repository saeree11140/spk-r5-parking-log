import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";

import { AuthGate } from "./auth-gate";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));

describe("AuthGate", () => {
  afterEach(() => {
    navigation.pathname = "/";
    navigation.replace.mockReset();
    useAuthStore.getState().setChecking();
  });

  it("sends forced-change users only to change-password", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ mustChangePassword: true }),
    });

    render(
      <AuthGate>
        <div>protected</div>
      </AuthGate>,
    );

    expect(navigation.replace).toHaveBeenCalledWith("/change-password");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders login without the protected shell when signed out", () => {
    navigation.pathname = "/login";
    useAuthStore.getState().setUnauthenticated();

    render(
      <AuthGate>
        <div>login</div>
      </AuthGate>,
    );

    expect(screen.getByText("login")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
