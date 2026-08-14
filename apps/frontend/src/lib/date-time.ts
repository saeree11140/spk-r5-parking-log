import { isValid, parseISO } from "date-fns";

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const BUDDHIST_DATE_TIME_INPUT_PATTERN =
  /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;
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

export function toDateTimeLocalCeilingValue(value: string | Date): string {
  const date = parseDateTime(value);
  if (!isValid(date)) return "";

  const remainder = date.getTime() % 60_000;
  const roundedDate =
    remainder === 0 ? date : new Date(date.getTime() + 60_000 - remainder);
  return toDateTimeLocalValue(roundedDate);
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

export function isBeforeViolation(value: string, occurredAt: string): boolean {
  const paidAt = parseLocalDateTime(value);
  const violationAt = parseISO(occurredAt);
  return (
    isValid(paidAt) &&
    isValid(violationAt) &&
    paidAt.getTime() < violationAt.getTime()
  );
}

export function formatDateTimeInputValue(value: string): string {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  const date = parseLocalDateTime(value);
  if (!match || !isValid(date)) return "";

  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${Number(year) + 543} ${hour}:${minute}`;
}

export function parseDateTimeInputValue(value: string): string {
  const match = BUDDHIST_DATE_TIME_INPUT_PATTERN.exec(value);
  if (!match) throw new Error("Invalid date time input");

  const [, day, month, buddhistYear, hour, minute] = match;
  const gregorianYear = Number(buddhistYear) - 543;
  const normalized = `${String(gregorianYear).padStart(4, "0")}-${month}-${day}T${hour}:${minute}`;
  if (gregorianYear < 1 || !isValid(parseLocalDateTime(normalized))) {
    throw new Error("Invalid date time input");
  }

  return normalized;
}

export function maskDateTimeInputValue(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 12);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
    digits.slice(8, 10),
    digits.slice(10, 12),
  ];

  let masked = parts[0];
  if (digits.length > 2) masked += `/${parts[1]}`;
  if (digits.length > 4) masked += `/${parts[2]}`;
  if (digits.length > 8) masked += ` ${parts[3]}`;
  if (digits.length > 10) masked += `:${parts[4]}`;
  return masked;
}

export function isLocalDateTimeInRange(
  value: string,
  minValue?: string,
  maxValue?: string,
): boolean {
  const date = parseLocalDateTime(value);
  if (!isValid(date)) return false;

  if (minValue) {
    const minimum = parseLocalDateTime(minValue);
    if (!isValid(minimum) || date.getTime() < minimum.getTime()) return false;
  }

  if (maxValue) {
    const maximum = parseLocalDateTime(maxValue);
    if (!isValid(maximum) || date.getTime() > maximum.getTime()) return false;
  }

  return true;
}
