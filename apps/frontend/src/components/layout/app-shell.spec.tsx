import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/lib/api/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { makeAuthUser } from "@/test/fixtures";
import { renderWithRouter } from "@/test/render";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().setChecking();
  });

  it("shows identity and user management only to admins", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ displayName: "นิติบุคคล", role: "ADMIN" }),
    });

    await renderWithRouter(<AppShell>content</AppShell>, { path: "$" });

    expect(screen.getByText("นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "ผู้ใช้งาน" })
        .every((link) => link.getAttribute("href") === "/users"),
    ).toBe(true);
  });

  it("does not show user management to staff", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    await renderWithRouter(<AppShell>content</AppShell>, { path: "$" });

    expect(
      screen.queryByRole("link", { name: "ผู้ใช้งาน" }),
    ).not.toBeInTheDocument();
  });

  it("shows violation category management to staff", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    await renderWithRouter(<AppShell>content</AppShell>, { path: "$" });

    expect(
      screen
        .getAllByRole("link", { name: "หมวดการกระทำผิด" })
        .every((link) => link.getAttribute("href") === "/violation-categories"),
    ).toBe(true);
  });

  it("links the house directory navigation to its own route", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    await renderWithRouter(<AppShell>content</AppShell>, { path: "$" });

    expect(
      within(screen.getByRole("complementary")).getByRole("link", {
        name: "รายชื่อบ้าน",
      }),
    ).toHaveAttribute("href", "/houses");
  });

  it("marks the house directory active on its index route", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: makeAuthUser({ role: "STAFF" }),
    });

    await renderWithRouter(<AppShell>content</AppShell>, {
      path: "$",
      initialEntry: "/houses",
    });

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

    const { router } = await renderWithRouter(<AppShell>content</AppShell>, {
      path: "$",
    });
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
    expect(router.state.location.pathname).toBe("/");
  });
});
