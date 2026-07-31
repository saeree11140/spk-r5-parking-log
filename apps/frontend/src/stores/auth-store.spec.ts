import { afterEach, describe, expect, it } from "vitest";

import { makeAuthUser } from "@/test/fixtures";

import { useAuthStore } from "./auth-store";

describe("useAuthStore", () => {
  afterEach(() => useAuthStore.getState().setChecking());

  it("stores user but never tokens", () => {
    const adminUser = makeAuthUser();

    useAuthStore.getState().setAuthenticated(adminUser);

    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: adminUser,
    });
    expect(JSON.stringify(useAuthStore.getState())).not.toContain("token");
  });
});
