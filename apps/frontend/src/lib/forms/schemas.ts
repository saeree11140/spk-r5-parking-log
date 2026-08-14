import { z } from "zod";

import {
  isBeforeViolation,
  isFutureDateTime,
  localDateTimeToIso,
} from "@/lib/date-time";

function isValidLocalDateTime(value: string): boolean {
  try {
    localDateTimeToIso(value);
    return true;
  } catch {
    return false;
  }
}

function localDateTimeSchema(now: Date) {
  return z
    .string()
    .min(1, "กรุณาระบุวันเวลา")
    .refine(isValidLocalDateTime, "กรุณาระบุวันเวลา")
    .refine((value) => !isFutureDateTime(value, now), {
      message: "วันเวลาต้องไม่อยู่ในอนาคต",
    });
}

function optionalTrimmedText(maximum: number, message: string) {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(maximum, message))
    .optional()
    .transform((value) => value || undefined);
}

function violationFields(now: Date) {
  return {
    occurredAt: localDateTimeSchema(now),
    note: optionalTrimmedText(
      1_000,
      "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร",
    ),
  };
}

export function createViolationSchema(now: Date) {
  return z.object(violationFields(now));
}

export function editViolationSchema(now: Date) {
  return z.object(violationFields(now));
}

export const cancelViolationSchema = z.object({
  reason: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(5, "เหตุผลต้องมี 5–500 ตัวอักษร")
        .max(500, "เหตุผลต้องมี 5–500 ตัวอักษร"),
    ),
});

export function markFinePaidSchema(occurredAt: string, now: Date) {
  return z.object({
    paidAt: localDateTimeSchema(now).refine(
      (value) => !isBeforeViolation(value, occurredAt),
      { message: "เวลาชำระต้องไม่ก่อนเวลาเกิดเหตุ" },
    ),
    reference: optionalTrimmedText(
      128,
      "เลขอ้างอิงต้องไม่เกิน 128 ตัวอักษร",
    ),
  });
}

export type CreateViolationFormValues = z.infer<
  ReturnType<typeof createViolationSchema>
>;
export type CreateViolationFormInput = z.input<
  ReturnType<typeof createViolationSchema>
>;
export type EditViolationFormValues = z.infer<
  ReturnType<typeof editViolationSchema>
>;
export type EditViolationFormInput = z.input<
  ReturnType<typeof editViolationSchema>
>;
export type CancelViolationFormValues = z.infer<typeof cancelViolationSchema>;
export type MarkFinePaidFormValues = z.infer<
  ReturnType<typeof markFinePaidSchema>
>;
export type MarkFinePaidFormInput = z.input<
  ReturnType<typeof markFinePaidSchema>
>;
