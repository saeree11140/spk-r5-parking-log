import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CancelViolationDto } from './cancel-violation.dto';
import { ViolationRouteDto } from './violation-route.dto';

describe('CancelViolationDto', () => {
  it('trims valid reason', async () => {
    const dto = plainToInstance(CancelViolationDto, {
      reason: '  wrong house  ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.reason).toBe('wrong house');
  });

  it.each(['1234', 'x'.repeat(501)])(
    'rejects reason length',
    async (reason) => {
      const dto = plainToInstance(CancelViolationDto, { reason });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
});

describe('ViolationRouteDto', () => {
  it('accepts valid house code and UUID', async () => {
    const dto = plainToInstance(ViolationRouteDto, {
      houseCode: 'R5-164',
      violationId: '00000000-0000-4000-8000-000000000001',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid violation ID', async () => {
    const dto = plainToInstance(ViolationRouteDto, {
      houseCode: 'R5-001',
      violationId: 'not-uuid',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
