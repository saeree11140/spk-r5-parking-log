import { DomainError } from './domain-error';

const TIMEZONE_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/;

export function parsePastDateTime(value: string, now: Date): Date {
  if (!TIMEZONE_SUFFIX.test(value)) {
    throw new DomainError(
      400,
      'INVALID_TIMESTAMP',
      'Timestamp must be ISO 8601 with timezone',
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainError(400, 'INVALID_TIMESTAMP', 'Timestamp is invalid');
  }
  if (parsed.getTime() > now.getTime()) {
    throw new DomainError(
      400,
      'FUTURE_TIMESTAMP',
      'Timestamp cannot be in future',
    );
  }

  return parsed;
}
