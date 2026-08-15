import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  formatThaiDateTime,
  isBeforeViolation,
  isFutureDateTime,
  isLocalDateTimeInRange,
  localDateTimeToIso,
  toDateTimeLocalCeilingValue,
  toDateTimeLocalValue,
} from "./date-time";

const originalTimeZone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "UTC";
});

afterAll(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

describe("date-time utilities", () => {
  it("formats an API timestamp in Bangkok when the host timezone is UTC", () => {
    expect(formatThaiDateTime("2026-07-01T03:00:00.000Z")).toBe(
      "01/07/2569 10:00",
    );
  });

  it("returns an em dash for an invalid display timestamp", () => {
    expect(formatThaiDateTime("invalid")).toBe("—");
  });

  it("converts an API timestamp to a second-precision Bangkok local value", () => {
    expect(toDateTimeLocalValue("2026-07-01T03:00:45.123Z")).toBe(
      "2026-07-01T10:00:45",
    );
  });

  it("rounds a timestamp with milliseconds up to the next Bangkok second", () => {
    expect(toDateTimeLocalCeilingValue("2026-07-01T03:00:45.123Z")).toBe(
      "2026-07-01T10:00:46",
    );
  });

  it("keeps an exact-second timestamp unchanged when rounding", () => {
    expect(toDateTimeLocalCeilingValue("2026-07-01T03:00:45.000Z")).toBe(
      "2026-07-01T10:00:45",
    );
  });

  it("converts a second-precision Bangkok local value to ISO", () => {
    expect(localDateTimeToIso("2026-07-01T10:00:45")).toBe(
      "2026-07-01T03:00:45.000Z",
    );
  });

  it("accepts a legacy minute-precision local value as zero seconds", () => {
    expect(localDateTimeToIso("2026-07-01T10:00")).toBe(
      "2026-07-01T03:00:00.000Z",
    );
  });

  it("rejects malformed local datetime input", () => {
    expect(() => localDateTimeToIso("not-a-date")).toThrow(
      "Invalid local date time",
    );
  });

  it("detects a local datetime later than now", () => {
    expect(
      isFutureDateTime(
        "2026-07-20T10:00:01",
        new Date("2026-07-20T03:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("allows a local datetime equal to now", () => {
    expect(
      isFutureDateTime(
        "2026-07-20T10:00:00",
        new Date("2026-07-20T03:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("detects payment before the violation timestamp", () => {
    expect(
      isBeforeViolation("2026-07-01T09:59:59", "2026-07-01T03:00:00.000Z"),
    ).toBe(true);
  });

  it("treats range boundaries as inclusive", () => {
    expect(
      isLocalDateTimeInRange(
        "2026-08-14T17:30",
        "2026-08-14T17:30",
        "2026-08-14T17:30",
      ),
    ).toBe(true);
  });

  it("rejects a normalized value after the maximum", () => {
    expect(
      isLocalDateTimeInRange(
        "2026-08-14T17:30:01",
        undefined,
        "2026-08-14T17:30:00",
      ),
    ).toBe(false);
  });
});
