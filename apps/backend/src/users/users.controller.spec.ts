import type { AuthenticatedUser } from '../auth/auth.types';
import { UsersController } from './users.controller';
import type { UsersService } from './users.service';

describe('UsersController', () => {
  it('delegates user creation with the authenticated actor', async () => {
    const create = jest.fn().mockResolvedValue({ user: { id: 'staff-id' } });
    const controller = new UsersController({
      create,
    } as unknown as UsersService);
    const actor = { id: 'admin-id' } as AuthenticatedUser;
    const input = {
      username: 'staff',
      displayName: 'เจ้าหน้าที่',
      role: 'STAFF' as const,
      temporaryPassword: 'StrongPassword123',
    };

    await expect(controller.create(actor, input)).resolves.toEqual({
      user: { id: 'staff-id' },
    });
    expect(create).toHaveBeenCalledWith(actor, input);
  });
});
