import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateViolationDto } from './update-violation.dto';

describe('UpdateViolationDto', () => {
  it('accepts a timezone-qualified occurredAt and trims note', async () => {
    const dto = plainToInstance(UpdateViolationDto, {
      occurredAt: '2026-08-14T10:00:00+07:00',
      note: '  แก้ไขหมายเหตุ  ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.note).toBe('แก้ไขหมายเหตุ');
  });

  it('accepts an omitted note without adding a value', async () => {
    const dto = plainToInstance(UpdateViolationDto, {
      occurredAt: '2026-08-14T10:00:00+07:00',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.note).toBeUndefined();
  });

  it('converts a blank note to null', async () => {
    const dto = plainToInstance(UpdateViolationDto, {
      occurredAt: '2026-08-14T10:00:00+07:00',
      note: '   ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.note).toBeNull();
  });

  it.each([
    ['a future date', '2099-08-14T10:00:00+07:00'],
    ['a malformed date', 'not-a-date'],
    ['a date without a timezone', '2026-08-14T10:00:00'],
    ['a missing date', undefined],
  ])('rejects %s', async (_description, occurredAt) => {
    const dto = plainToInstance(UpdateViolationDto, { occurredAt });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects a note longer than 1000 characters', async () => {
    const dto = plainToInstance(UpdateViolationDto, {
      occurredAt: '2026-08-14T10:00:00+07:00',
      note: 'x'.repeat(1001),
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
