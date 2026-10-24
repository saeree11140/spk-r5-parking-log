import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");

describe("index.html", () => {
  it("prevents indexing, following and caching", () => {
    expect(html).toContain(
      '<meta name="robots" content="noindex, nofollow, noarchive" />',
    );
  });

  it("declares the Thai document language", () => {
    expect(html).toContain('<html lang="th">');
  });
});
