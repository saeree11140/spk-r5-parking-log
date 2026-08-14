import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/lib/api/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";
import { renderWithQueryClient } from "@/test/render";

import { AppShell } from "./app-shell";

const { navigation, replace } = vi.hoisted(() => ({
  navigation: { pathname: "/" },
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace }),
}));

describe("AppShell", () => {
  afterEach(() => {
    replace.mockReset();
    navigation.pathname = "/";
    vi.restoreAllMocks();
    useAuthStore.getState().setChecking();
  });

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

  it("links the house directory navigation to its own route", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    renderWithQueryClient(<AppShell>content</AppShell>);

    expect(
      within(screen.getByRole("complementary")).getByRole("link", {
        name: "รายชื่อบ้าน",
      }),
    ).toHaveAttribute("href", "/houses");
  });

  it("marks the house directory active on its index route", () => {
    navigation.pathname = "/houses";
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    renderWithQueryClient(<AppShell>content</AppShell>);

    expect(
      within(screen.getByRole("complementary")).getByRole("link", {
        name: "รายชื่อบ้าน",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps the authenticated state when logout fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, "logout").mockRejectedValue(new Error("network"));
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "ADMIN" }),
    });

    renderWithQueryClient(<AppShell>content</AppShell>);
    await user.click(
      within(screen.getByRole("complementary")).getByRole("button", {
        name: "ออกจากระบบ",
      }),
    );

    expect(
      await screen.findByText("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe("authenticated"),
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
