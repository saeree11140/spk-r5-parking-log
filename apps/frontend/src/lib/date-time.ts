import { isValid, parseISO } from "date-fns";

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const BANGKOK_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseLocalDateTime(value: string): Date {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return new Date(Number.NaN);

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const bangkokWallClock = new Date(0);
  bangkokWallClock.setUTCFullYear(year, month - 1, day);
  bangkokWallClock.setUTCHours(hour, minute, 0, 0);

  if (
    bangkokWallClock.getUTCFullYear() !== year ||
    bangkokWallClock.getUTCMonth() !== month - 1 ||
    bangkokWallClock.getUTCDate() !== day ||
    bangkokWallClock.getUTCHours() !== hour ||
    bangkokWallClock.getUTCMinutes() !== minute
  ) {
    return new Date(Number.NaN);
  }

  return new Date(bangkokWallClock.getTime() - BANGKOK_OFFSET_MILLISECONDS);
}

function parseDateTime(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

export function formatThaiDateTime(value: string | Date | null): string {
  if (value === null) return "—";

  const date = parseDateTime(value);
  if (!isValid(date)) return "—";

  const bangkokWallClock = new Date(
    date.getTime() + BANGKOK_OFFSET_MILLISECONDS,
  );
  const buddhistYear = bangkokWallClock.getUTCFullYear() + 543;
  return `${pad(bangkokWallClock.getUTCDate())}/${pad(
    bangkokWallClock.getUTCMonth() + 1,
  )}/${buddhistYear} ${pad(bangkokWallClock.getUTCHours())}:${pad(
    bangkokWallClock.getUTCMinutes(),
  )}`;
}

export function toDateTimeLocalValue(value: string | Date): string {
  const date = parseDateTime(value);
  if (!isValid(date)) return "";

  const bangkokWallClock = new Date(
    date.getTime() + BANGKOK_OFFSET_MILLISECONDS,
  );
  return `${bangkokWallClock.getUTCFullYear()}-${pad(
    bangkokWallClock.getUTCMonth() + 1,
  )}-${pad(bangkokWallClock.getUTCDate())}T${pad(
    bangkokWallClock.getUTCHours(),
  )}:${pad(bangkokWallClock.getUTCMinutes())}`;
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
  return isValid(date) && date.getTime() > now.getTime();
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
    paidAt.getTime() < violationAt.getTime()
  );
}
