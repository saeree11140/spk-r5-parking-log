import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("AppShell", () => {
  it("shows identity and user management only to admins", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ displayName: "นิติบุคคล", role: "ADMIN" }),
    });

    renderWithQueryClient(<AppShell>content</AppShell>);

    expect(screen.getByText("นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "ผู้ใช้งาน" })
        .every((link) => link.getAttribute("href") === "/users"),
    ).toBe(true);
  });

  it("does not show user management to staff", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    renderWithQueryClient(<AppShell>content</AppShell>);

    expect(
      screen.queryByRole("link", { name: "ผู้ใช้งาน" }),
    ).not.toBeInTheDocument();
  });
});
