import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { HouseCodeDto } from './house-code.dto';
import { HousesController } from './houses.controller';
import type { HousesService } from './houses.service';

describe('HousesController', () => {
  it('delegates list and detail queries', async () => {
    const getByCode = jest.fn().mockResolvedValue({ code: 'R5-001' });
    const service = {
      list: jest.fn().mockResolvedValue([]),
      getByCode,
    } as unknown as HousesService;
    const controller = new HousesController(service);

    await expect(controller.list()).resolves.toEqual([]);
    await expect(controller.get({ houseCode: 'R5-001' })).resolves.toEqual({
      code: 'R5-001',
    });
    expect(getByCode).toHaveBeenCalledWith('R5-001');
  });

  it.each(['R5-001', 'R5-164'])('accepts valid house code %s', async (code) => {
    const dto = plainToInstance(HouseCodeDto, { houseCode: code });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['R5-000', 'R5-165', 'r5-001', 'R5-1'])(
    'rejects invalid house code %s',
    async (code) => {
      const dto = plainToInstance(HouseCodeDto, { houseCode: code });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
});
