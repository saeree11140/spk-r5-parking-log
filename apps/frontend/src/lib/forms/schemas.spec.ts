import { describe, expect, it } from "vitest";

import {
  cancelViolationSchema,
  createViolationSchema,
  editViolationSchema,
  markFinePaidSchema,
} from "./schemas";

process.env.TZ = "Asia/Bangkok";

const now = new Date("2026-07-20T03:00:00.000Z");

function messages(result: { error?: { issues: Array<{ message: string }> } }) {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe("createViolationSchema", () => {
  it("requires an occurred-at value", () => {
    const result = createViolationSchema(now).safeParse({ occurredAt: "" });

    expect(messages(result)).toContain("กรุณาระบุวันเวลา");
  });

  it("rejects an occurred-at value in the future", () => {
    const result = createViolationSchema(now).safeParse({
      occurredAt: "2026-07-20T10:00:01",
    });

    expect(messages(result)).toContain("วันเวลาต้องไม่อยู่ในอนาคต");
  });

  it("trims note and omits an empty note", () => {
    const schema = createViolationSchema(now);

    expect(
      schema.parse({
        note: "  จอดกีดขวาง  ",
        occurredAt: "2026-07-20T10:00",
      }).note,
    ).toBe("จอดกีดขวาง");
    expect(
      schema.parse({ note: "   ", occurredAt: "2026-07-20T10:00" }).note,
    ).toBeUndefined();
  });

  it("rejects note longer than 1,000 characters", () => {
    const result = createViolationSchema(now).safeParse({
      note: "ก".repeat(1001),
      occurredAt: "2026-07-20T10:00",
    });

    expect(messages(result)).toContain(
      "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร",
    );
  });
});

describe("editViolationSchema", () => {
  it("requires an occurred-at value", () => {
    const result = editViolationSchema(now).safeParse({ occurredAt: "" });

    expect(messages(result)).toContain("กรุณาระบุวันเวลา");
  });

  it("rejects an occurred-at value in the future", () => {
    const result = editViolationSchema(now).safeParse({
      occurredAt: "2026-07-20T10:01",
    });

    expect(messages(result)).toContain("วันเวลาต้องไม่อยู่ในอนาคต");
  });

  it("trims note and omits a blank note at form level", () => {
    const schema = editViolationSchema(now);

    expect(
      schema.parse({
        note: "  จอดกีดขวาง  ",
        occurredAt: "2026-07-20T10:00",
      }).note,
    ).toBe("จอดกีดขวาง");
    expect(
      schema.parse({ note: "   ", occurredAt: "2026-07-20T10:00" }).note,
    ).toBeUndefined();
  });
});

describe("cancelViolationSchema", () => {
  it("trims a valid reason", () => {
    expect(cancelViolationSchema.parse({ reason: "  บันทึกผิดบ้าน  " })).toEqual(
      { reason: "บันทึกผิดบ้าน" },
    );
  });

  it.each(["ผิด", "ก".repeat(501)])(
    "rejects a reason outside the 5–500 character range",
    (reason) => {
      const result = cancelViolationSchema.safeParse({ reason });

      expect(messages(result)).toContain("เหตุผลต้องมี 5–500 ตัวอักษร");
    },
  );
});

describe("markFinePaidSchema", () => {
  const occurredAt = "2026-07-20T02:00:00.000Z";

  it("rejects a payment time in the future", () => {
    const result = markFinePaidSchema(occurredAt, now).safeParse({
      paidAt: "2026-07-20T10:01",
    });

    expect(messages(result)).toContain("วันเวลาต้องไม่อยู่ในอนาคต");
  });

  it("rejects payment before the violation", () => {
    const result = markFinePaidSchema(occurredAt, now).safeParse({
      paidAt: "2026-07-20T08:59",
    });

    expect(messages(result)).toContain("เวลาชำระต้องไม่ก่อนเวลาเกิดเหตุ");
  });

  it("allows payment at the exact violation second", () => {
    const exactOccurredAt = "2026-07-20T02:00:45.000Z";
    const result = markFinePaidSchema(exactOccurredAt, now).safeParse({
      paidAt: "2026-07-20T09:00:45",
    });

    expect(result.success).toBe(true);
  });

  it("trims reference and omits an empty reference", () => {
    const schema = markFinePaidSchema(occurredAt, now);

    expect(
      schema.parse({
        paidAt: "2026-07-20T09:00",
        reference: "  receipt-001  ",
      }).reference,
    ).toBe("receipt-001");
    expect(
      schema.parse({ paidAt: "2026-07-20T09:00", reference: " " }).reference,
    ).toBeUndefined();
  });

  it("rejects reference longer than 128 characters", () => {
    const result = markFinePaidSchema(occurredAt, now).safeParse({
      paidAt: "2026-07-20T09:00",
      reference: "x".repeat(129),
    });

    expect(messages(result)).toContain(
      "เลขอ้างอิงต้องไม่เกิน 128 ตัวอักษร",
    );
  });
});
