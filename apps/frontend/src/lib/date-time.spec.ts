import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  formatDateTimeInputValue,
  formatThaiDateTime,
  isBeforeViolation,
  isFutureDateTime,
  isLocalDateTimeInRange,
  localDateTimeToIso,
  maskDateTimeInputValue,
  parseDateTimeInputValue,
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

  it("converts an API timestamp to a Bangkok datetime-local value when the host timezone is UTC", () => {
    expect(toDateTimeLocalValue("2026-07-01T03:00:00.000Z")).toBe(
      "2026-07-01T10:00",
    );
  });

  it("converts a Bangkok datetime-local value to ISO when the host timezone is UTC", () => {
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
      isBeforeViolation("2026-07-01T09:59", "2026-07-01T03:00:00.000Z"),
    ).toBe(true);
  });

  it("formats a normalized value as a Buddhist date-time input", () => {
    expect(formatDateTimeInputValue("2026-08-14T17:30")).toBe(
      "14/08/2569 17:30",
    );
  });

  it("parses a Buddhist date-time input into the normalized value", () => {
    expect(parseDateTimeInputValue("14/08/2569 17:30")).toBe(
      "2026-08-14T17:30",
    );
  });

  it("accepts a real Buddhist leap day", () => {
    expect(parseDateTimeInputValue("29/02/2567 00:00")).toBe(
      "2024-02-29T00:00",
    );
  });

  it("rejects an impossible Buddhist date", () => {
    expect(() => parseDateTimeInputValue("29/02/2568 10:00")).toThrow(
      "Invalid date time input",
    );
  });

  it("rejects a time outside the 24-hour range", () => {
    expect(() => parseDateTimeInputValue("14/08/2569 24:00")).toThrow(
      "Invalid date time input",
    );
  });

  it("masks twelve entered digits as day month Buddhist year and time", () => {
    expect(maskDateTimeInputValue("140825691730")).toBe("14/08/2569 17:30");
  });

  it("strips non-Latin digits and limits the mask to twelve digits", () => {
    expect(maskDateTimeInputValue("14a08/2569 17:3099")).toBe(
      "14/08/2569 17:30",
    );
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
      isLocalDateTimeInRange("2026-08-14T17:30", undefined, "2026-08-14T17:29"),
    ).toBe(false);
  });
});
