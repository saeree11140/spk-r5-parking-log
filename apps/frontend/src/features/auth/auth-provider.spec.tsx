import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithQueryClient } from "@/test/render";

import { AuthProvider } from "./auth-provider";

const { authExpired, me } = vi.hoisted(() => ({
  authExpired: { handler: null as null | (() => void) },
  me: vi.fn(),
}));

vi.mock("@/lib/api/auth-api", () => ({
  authApi: { me },
}));
vi.mock("@/lib/api/client", () => ({
  registerAuthExpiredHandler: (handler: () => void) => {
    authExpired.handler = handler;
    return () => {
      authExpired.handler = null;
    };
  },
}));

describe("AuthProvider", () => {
  afterEach(() => me.mockReset());

  it("bootstraps current user without flashing protected children", () => {
    me.mockReturnValue(new Promise(() => undefined));

    renderWithQueryClient(
      <AuthProvider>
        <div>protected</div>
      </AuthProvider>,
    );

    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(screen.getByText("กำลังตรวจสอบสิทธิ์")).toBeInTheDocument();
  });

  it("leaves bootstrap when session expiry is reported during me request", () => {
    me.mockReturnValue(new Promise(() => undefined));

    renderWithQueryClient(
      <AuthProvider>
        <div>public route</div>
      </AuthProvider>,
    );
    act(() => authExpired.handler?.());

    expect(screen.getByText("public route")).toBeInTheDocument();
    expect(screen.queryByText("กำลังตรวจสอบสิทธิ์")).not.toBeInTheDocument();
  });
});
