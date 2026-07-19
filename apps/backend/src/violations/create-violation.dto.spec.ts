import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateViolationDto } from './create-violation.dto';

describe('CreateViolationDto', () => {
  it('trims an optional note', async () => {
    const dto = plainToInstance(CreateViolationDto, {
      occurredAt: '2026-07-19T10:00:00+07:00',
      note: '  blocked gate  ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.note).toBe('blocked gate');
  });

  it('rejects note longer than 1000 characters', async () => {
    const dto = plainToInstance(CreateViolationDto, {
      occurredAt: '2026-07-19T10:00:00+07:00',
      note: 'x'.repeat(1001),
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects occurredAt without timezone', async () => {
    const dto = plainToInstance(CreateViolationDto, {
      occurredAt: '2026-07-19T10:00:00',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
