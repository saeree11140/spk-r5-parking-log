import type { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PasswordService } from '../auth/password.service';
import { UsersService } from './users.service';

const admin: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'admin',
  displayName: 'ผู้ดูแลระบบ',
  role: 'ADMIN',
  isActive: true,
  mustChangePassword: false,
  sessionId: '10000000-0000-4000-8000-000000000001',
  sessionExpiresAt: new Date(Date.now() + 60_000),
};

const targetAdmin = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'admin.two',
  displayName: 'ผู้ดูแลระบบสอง',
  passwordHash: 'stored-hash',
  role: 'ADMIN' as const,
  isActive: true,
  mustChangePassword: false,
  failedLoginAttempts: 0,
  lockedUntil: null,
  passwordChangedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const staff = {
  ...targetAdmin,
  id: '00000000-0000-4000-8000-000000000003',
  username: 'staff',
  displayName: 'เจ้าหน้าที่',
  role: 'STAFF' as const,
};

describe('UsersService', () => {
  function setup() {
    const tx = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      authSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      user: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(
        (operation: (transaction: typeof tx) => Promise<unknown>) =>
          operation(tx),
      ),
    };
    const passwordService = {
      validate: jest.fn().mockReturnValue({ valid: true }),
      hash: jest.fn().mockResolvedValue('argon-hash'),
    };
    const service = new UsersService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
    );

    return { service, prisma, tx, passwordService };
  }

  it('creates normalized user with forced password change', async () => {
    const { service, tx } = setup();
    let createArgs: { data: Record<string, unknown> } | undefined;
    tx.user.create.mockImplementation(
      (args: { data: Record<string, unknown> }) => {
        createArgs = args;
        return Promise.resolve(staff);
      },
    );

    await service.create(admin, {
      username: ' Staff.One ',
      displayName: 'เจ้าหน้าที่หนึ่ง',
      role: 'STAFF',
      temporaryPassword: 'StrongPassword123',
    });

    expect(createArgs?.data.username).toBe('staff.one');
    expect(createArgs?.data.role).toBe('STAFF');
    expect(createArgs?.data.mustChangePassword).toBe(true);
    expect(createArgs?.data.passwordHash).toBe('argon-hash');
  });

  it('rejects deactivating self', async () => {
    const { service } = setup();

    await expect(
      service.update(admin, admin.id, { isActive: false }),
    ).rejects.toMatchObject({ code: 'USER_SELF_DEACTIVATE' });
  });

  it('protects the last admin inside a serializable transaction', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValue(targetAdmin);
    tx.user.count.mockResolvedValue(1);

    await expect(
      service.update(admin, targetAdmin.id, { role: 'STAFF' }),
    ).rejects.toMatchObject({ code: 'USER_LAST_ADMIN' });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('resets password and revokes all target sessions', async () => {
    const { service, tx } = setup();
    let updateArgs:
      { where: unknown; data: Record<string, unknown> } | undefined;
    let sessionArgs:
      { where: unknown; data: Record<string, unknown> } | undefined;
    tx.user.findUnique.mockResolvedValue(staff);
    tx.user.update.mockImplementation(
      (args: { where: unknown; data: Record<string, unknown> }) => {
        updateArgs = args;
        return Promise.resolve({
          ...staff,
          mustChangePassword: true,
        });
      },
    );
    tx.authSession.updateMany.mockImplementation(
      (args: { where: unknown; data: Record<string, unknown> }) => {
        sessionArgs = args;
        return Promise.resolve({ count: 1 });
      },
    );

    await service.resetPassword(admin, staff.id, {
      temporaryPassword: 'StrongPassword123',
    });

    expect(updateArgs?.where).toEqual({ id: staff.id });
    expect(updateArgs?.data.passwordHash).toBe('argon-hash');
    expect(updateArgs?.data.mustChangePassword).toBe(true);
    expect(sessionArgs?.where).toEqual({
      userId: staff.id,
      revokedAt: null,
    });
    expect(sessionArgs?.data.revokedAt).toBeInstanceOf(Date);
  });

  it('maps duplicate usernames to USERNAME_TAKEN', async () => {
    const { service, tx } = setup();
    tx.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(admin, {
        username: 'staff',
        displayName: 'เจ้าหน้าที่',
        role: 'STAFF',
        temporaryPassword: 'StrongPassword123',
      }),
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
  });

  it('lists users in deterministic username order without password data', async () => {
    const { service, prisma } = setup();
    prisma.user.findMany.mockResolvedValue([targetAdmin, staff]);

    const result = await service.list();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { username: 'asc' },
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('stored-hash');
  });

  it.each([
    {
      current: { ...staff, isActive: true },
      input: { isActive: false },
      action: 'DEACTIVATE',
    },
    {
      current: { ...staff, isActive: false },
      input: { isActive: true },
      action: 'ACTIVATE',
    },
  ])('writes $action audit for status changes', async (scenario) => {
    const { service, tx } = setup();
    let auditArgs: { data: Record<string, unknown> } | undefined;
    tx.user.findUnique.mockResolvedValue(scenario.current);
    tx.user.update.mockResolvedValue({
      ...scenario.current,
      ...scenario.input,
    });
    tx.auditLog.create.mockImplementation(
      (args: { data: Record<string, unknown> }) => {
        auditArgs = args;
        return Promise.resolve({});
      },
    );

    await service.update(admin, staff.id, scenario.input);

    expect(auditArgs?.data.action).toBe(scenario.action);
  });
});
