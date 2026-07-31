import { describe, expect, it } from "vitest";

import { createUserSchema, resetPasswordSchema } from "./user-schemas";

describe("user schemas", () => {
  it("normalizes usernames and enforces temporary password policy", () => {
    const parsed = createUserSchema.parse({
      displayName: " เจ้าหน้าที่หนึ่ง ",
      role: "STAFF",
      temporaryPassword: "StrongPassword123",
      username: " Staff.One ",
    });

    expect(parsed.username).toBe("staff.one");
    expect(parsed.displayName).toBe("เจ้าหน้าที่หนึ่ง");
    expect(() =>
      resetPasswordSchema.parse({ temporaryPassword: "weak" }),
    ).toThrow();
  });
});
