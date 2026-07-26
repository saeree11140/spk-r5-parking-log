import { describe, expect, it } from "vitest";

import {
  formatThaiDateTime,
  isBeforeViolation,
  isFutureDateTime,
  localDateTimeToIso,
  toDateTimeLocalValue,
} from "./date-time";

process.env.TZ = "Asia/Bangkok";

describe("date-time utilities", () => {
  it("formats an API timestamp as Thai local Buddhist date and time", () => {
    expect(formatThaiDateTime("2026-07-01T03:00:00.000Z")).toBe(
      "01/07/2569 10:00",
    );
  });

  it("returns an em dash for an invalid display timestamp", () => {
    expect(formatThaiDateTime("invalid")).toBe("—");
  });

  it("converts an API timestamp to a datetime-local value", () => {
    expect(toDateTimeLocalValue("2026-07-01T03:00:00.000Z")).toBe(
      "2026-07-01T10:00",
    );
  });

  it("converts a local Bangkok datetime to ISO", () => {
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
        "2026-07-20T10:01",
        new Date("2026-07-20T03:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("allows a local datetime equal to now", () => {
    expect(
      isFutureDateTime(
        "2026-07-20T10:00",
        new Date("2026-07-20T03:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("detects payment before the violation timestamp", () => {
    expect(
      isBeforeViolation(
        "2026-07-01T09:59",
        "2026-07-01T03:00:00.000Z",
      ),
    ).toBe(true);
  });
});
