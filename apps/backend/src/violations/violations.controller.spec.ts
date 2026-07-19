import { ViolationsController } from './violations.controller';
import type { ViolationsService } from './violations.service';

describe('ViolationsController', () => {
  it('delegates violation creation using house code', async () => {
    const create = jest.fn().mockResolvedValue({ violation: { id: 'v-1' } });
    const service = { create } as unknown as ViolationsService;
    const controller = new ViolationsController(service);
    const dto = { occurredAt: '2026-07-18T10:00:00+07:00' };

    await expect(
      controller.create({ houseCode: 'R5-001' }, dto),
    ).resolves.toEqual({ violation: { id: 'v-1' } });
    expect(create).toHaveBeenCalledWith('R5-001', dto);
  });
});
