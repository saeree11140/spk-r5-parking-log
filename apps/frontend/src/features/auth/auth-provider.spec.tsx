import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithQueryClient } from "@/test/render";

import { AuthProvider } from "./auth-provider";

const { me } = vi.hoisted(() => ({ me: vi.fn() }));

vi.mock("@/lib/api/auth-api", () => ({
  authApi: { me },
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
});
