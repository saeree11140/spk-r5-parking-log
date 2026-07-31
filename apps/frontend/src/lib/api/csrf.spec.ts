import { afterEach, describe, expect, it } from "vitest";

import { readCsrfCookie } from "./csrf";

describe("readCsrfCookie", () => {
  afterEach(() => {
    document.cookie =
      "spk_r5_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "other=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("reads and decodes spk_r5_csrf only", () => {
    document.cookie = "other=x; path=/";
    document.cookie = "spk_r5_csrf=abc%20123; path=/";

    expect(readCsrfCookie()).toBe("abc 123");
  });
});
