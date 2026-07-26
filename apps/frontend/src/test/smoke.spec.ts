import { describe, expect, it } from "vitest";

import { makeHouseSummary } from "./fixtures";

describe("frontend test setup", () => {
  it("creates typed house fixtures", () => {
    expect(makeHouseSummary({ code: "R5-164" }).code).toBe("R5-164");
  });
});
