import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { authApi } from "./auth-api";

describe("authApi", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the user from login without exposing transport tokens", async () => {
    const user = {
      id: "user-1",
      username: "admin",
      displayName: "ผู้ดูแลระบบ",
      role: "ADMIN" as const,
      isActive: true,
      mustChangePassword: false,
    };
    vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { user },
    });

    await expect(
      authApi.login({
        username: "admin",
        password: "StrongPassword123",
      }),
    ).resolves.toEqual(user);
  });
});
