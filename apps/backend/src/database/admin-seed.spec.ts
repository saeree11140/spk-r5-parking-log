import type { PasswordService } from '../auth/password.service';
import { seedAdmin, type AdminSeedPrisma } from './admin-seed';

describe('seedAdmin', () => {
  const input = {
    username: ' Admin ',
    displayName: 'ผู้ดูแลระบบ',
    password: 'StrongPassword123',
  };

  function createPrismaMock() {
    const findUnique = jest.fn<AdminSeedPrisma['user']['findUnique']>();
    const create = jest
      .fn<AdminSeedPrisma['user']['create']>()
      .mockResolvedValue({ id: 'created' });

    return {
      user: {
        findUnique,
        create,
        update: jest.fn(),
      },
    };
  }

  function createPasswordServiceMock() {
    const hash = jest
      .fn<PasswordService['hash']>()
      .mockResolvedValue('argon2id-hash');
    const service = {
      validate: jest.fn().mockReturnValue({ valid: true }),
      hash,
    } as unknown as PasswordService;

    return { service, hash };
  }

  it('creates the first admin with forced password change', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const { service: passwordService } = createPasswordServiceMock();

    const result = await seedAdmin(prisma, input, passwordService);

    expect(result).toBe('created');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: 'admin',
        displayName: 'ผู้ดูแลระบบ',
        passwordHash: 'argon2id-hash',
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });
  });

  it('does not overwrite an existing account', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const { service: passwordService, hash } = createPasswordServiceMock();

    await expect(seedAdmin(prisma, input, passwordService)).resolves.toBe(
      'existing',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });
});
