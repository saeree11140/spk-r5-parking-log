import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MarkFinePaidDto } from './mark-fine-paid.dto';

describe('MarkFinePaidDto', () => {
  it('accepts timestamp and trims reference', async () => {
    const dto = plainToInstance(MarkFinePaidDto, {
      paidAt: '2026-07-19T10:00:00+07:00',
      reference: '  receipt-001  ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.reference).toBe('receipt-001');
  });

  it('rejects timestamp without timezone', async () => {
    const dto = plainToInstance(MarkFinePaidDto, {
      paidAt: '2026-07-19T10:00:00',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects reference longer than 128 characters', async () => {
    const dto = plainToInstance(MarkFinePaidDto, {
      paidAt: '2026-07-19T10:00:00Z',
      reference: 'x'.repeat(129),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
