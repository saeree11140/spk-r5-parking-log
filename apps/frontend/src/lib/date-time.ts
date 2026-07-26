import {
  format,
  isAfter,
  isBefore,
  isValid,
  parse,
  parseISO,
} from "date-fns";
import { th } from "date-fns/locale";

const LOCAL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

function parseLocalDateTime(value: string): Date {
  return parse(value, LOCAL_DATE_TIME_FORMAT, new Date());
}

function parseDateTime(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

export function formatThaiDateTime(value: string | Date | null): string {
  if (value === null) return "—";

  const date = parseDateTime(value);
  if (!isValid(date)) return "—";

  const buddhistYear = date.getFullYear() + 543;
  return `${format(date, "dd/MM", { locale: th })}/${buddhistYear} ${format(
    date,
    "HH:mm",
    { locale: th },
  )}`;
}

export function toDateTimeLocalValue(value: string | Date): string {
  const date = parseDateTime(value);
  return isValid(date) ? format(date, LOCAL_DATE_TIME_FORMAT) : "";
}

export function localDateTimeToIso(value: string): string {
  const date = parseLocalDateTime(value);
  if (!isValid(date)) {
    throw new Error("Invalid local date time");
  }
  return date.toISOString();
}

export function isFutureDateTime(value: string, now: Date): boolean {
  const date = parseLocalDateTime(value);
  return isValid(date) && isAfter(date, now);
}

export function isBeforeViolation(
  value: string,
  occurredAt: string,
): boolean {
  const paidAt = parseLocalDateTime(value);
  const violationAt = parseISO(occurredAt);
  return (
    isValid(paidAt) &&
    isValid(violationAt) &&
    isBefore(paidAt, violationAt)
  );
}
