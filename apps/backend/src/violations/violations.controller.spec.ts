import type { AuthenticatedUser } from '../auth/auth.types';
import { ViolationsController } from './violations.controller';
import type { ViolationsService } from './violations.service';

describe('ViolationsController', () => {
  const authenticatedUser = {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: 'เจ้าหน้าที่หนึ่ง',
  } as AuthenticatedUser;

  it('delegates violation creation using house code', async () => {
    const create = jest.fn().mockResolvedValue({ violation: { id: 'v-1' } });
    const service = { create } as unknown as ViolationsService;
    const controller = new ViolationsController(service);
    const dto = { occurredAt: '2026-07-18T10:00:00+07:00' };

    await expect(
      controller.create({ houseCode: 'R5-001' }, dto, authenticatedUser),
    ).resolves.toEqual({ violation: { id: 'v-1' } });
    expect(create).toHaveBeenCalledWith(
      'R5-001',
      dto,
      expect.objectContaining({
        actorType: 'USER',
        actorId: authenticatedUser.id,
      }),
    );
  });

  it('delegates violation cancellation using route identifiers', async () => {
    const cancel = jest.fn().mockResolvedValue({
      violation: { id: 'v-1', status: 'CANCELLED' },
    });
    const controller = new ViolationsController({
      cancel,
    } as unknown as ViolationsService);
    const params = {
      houseCode: 'R5-001',
      violationId: '00000000-0000-4000-8000-000000000001',
    };
    const dto = { reason: 'wrong house' };

    await controller.cancel(params, dto, authenticatedUser);

    expect(cancel).toHaveBeenCalledWith(
      params.houseCode,
      params.violationId,
      dto,
      expect.objectContaining({
        actorType: 'USER',
        actorId: authenticatedUser.id,
      }),
    );
  });
});
