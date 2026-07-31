import { describe, expect, it } from "vitest";

import { changePasswordSchema, loginSchema } from "./auth-schemas";

describe("auth schemas", () => {
  it("normalizes username and rejects weak password", () => {
    expect(
      loginSchema.parse({
        username: " Admin ",
        password: "StrongPassword123",
      }).username,
    ).toBe("admin");

    expect(() =>
      changePasswordSchema.parse({
        confirmPassword: "weak",
        currentPassword: "CurrentPassword123",
        newPassword: "weak",
      }),
    ).toThrow();
  });

  it("requires matching confirmation", () => {
    expect(() =>
      changePasswordSchema.parse({
        confirmPassword: "DifferentPassword123",
        currentPassword: "CurrentPassword123",
        newPassword: "StrongPassword123",
      }),
    ).toThrow("รหัสผ่านใหม่ไม่ตรงกัน");
  });
});
