import { DomainError } from './domain-error';
import { parsePastDateTime } from './date-time';

describe('parsePastDateTime', () => {
  const now = new Date('2026-07-19T10:00:00.000Z');

  it('accepts ISO 8601 with timezone', () => {
    expect(parsePastDateTime('2026-07-19T16:00:00+07:00', now)).toEqual(
      new Date('2026-07-19T09:00:00.000Z'),
    );
  });

  it('rejects timestamp without timezone', () => {
    expect(() => parsePastDateTime('2026-07-19T09:00:00', now)).toThrow(
      new DomainError(
        400,
        'INVALID_TIMESTAMP',
        'Timestamp must be ISO 8601 with timezone',
      ),
    );
  });

  it('rejects future timestamp', () => {
    expect(() => parsePastDateTime('2026-07-19T10:00:01Z', now)).toThrow(
      new DomainError(400, 'FUTURE_TIMESTAMP', 'Timestamp cannot be in future'),
    );
  });
});
