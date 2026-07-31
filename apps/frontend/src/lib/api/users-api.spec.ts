import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { usersApi } from "./users-api";

describe("usersApi", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls ADMIN user endpoints with typed payloads", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { user: {} },
    });
    const patch = vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: { user: {} },
    });

    await usersApi.create({
      displayName: "เจ้าหน้าที่หนึ่ง",
      role: "STAFF",
      temporaryPassword: "StrongPassword123",
      username: "staff.one",
    });
    expect(post).toHaveBeenNthCalledWith(1, "/users", expect.any(Object));

    await usersApi.update("user-id", { isActive: false });
    expect(patch).toHaveBeenCalledWith("/users/user-id", {
      isActive: false,
    });

    await usersApi.resetPassword("user-id", {
      temporaryPassword: "StrongPassword123",
    });
    expect(post).toHaveBeenNthCalledWith(2, "/users/user-id/reset-password", {
      temporaryPassword: "StrongPassword123",
    });
  });
});
