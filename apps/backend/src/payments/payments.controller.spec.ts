import type { AuthenticatedUser } from '../auth/auth.types';
import { PaymentsController } from './payments.controller';
import type { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  const authenticatedUser = {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: 'เจ้าหน้าที่หนึ่ง',
  } as AuthenticatedUser;

  it('delegates mark-paid using route identifiers', async () => {
    const markPaid = jest.fn().mockResolvedValue({ cycleClosed: false });
    const controller = new PaymentsController({
      markPaid,
    } as unknown as PaymentsService);
    const params = {
      houseCode: 'R5-001',
      violationId: '00000000-0000-4000-8000-000000000003',
    };
    const dto = { paidAt: '2026-07-19T10:00:00+07:00' };

    await expect(
      controller.markPaid(params, dto, authenticatedUser),
    ).resolves.toEqual({
      cycleClosed: false,
    });
    expect(markPaid).toHaveBeenCalledWith(
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
