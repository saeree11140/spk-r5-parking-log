import { describe, expect, it } from "vitest";

import { ADMIN_ROBOTS_METADATA } from "./admin-metadata";

describe("ADMIN_ROBOTS_METADATA", () => {
  it("prevents indexing, following and caching", () => {
    expect(ADMIN_ROBOTS_METADATA).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
  });
});
