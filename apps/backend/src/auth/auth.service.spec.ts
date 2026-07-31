import type { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import type { PasswordService } from './password.service';
import type { TokenService } from './token.service';

const userRecord = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'admin',
  displayName: 'ผู้ดูแลระบบ',
  passwordHash: 'stored-password-hash',
  role: 'ADMIN' as const,
  isActive: true,
  mustChangePassword: false,
  failedLoginAttempts: 4,
  lockedUntil: null,
  passwordChangedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sessionRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: userRecord.id,
  refreshTokenHash: 'old-refresh-hash',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  revokedAt: null,
  lastUsedAt: new Date(),
  ipAddress: null,
  userAgent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: userRecord,
};

interface MutationArgs {
  where: unknown;
  data: Record<string, unknown>;
}

interface AuditCreateArgs {
  data: Record<string, unknown>;
}

type PrismaMock = {
  user: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
    update: jest.Mock<(args: MutationArgs) => Promise<unknown>>;
    updateMany: jest.Mock<(args: MutationArgs) => Promise<{ count: number }>>;
  };
  authSession: {
    findUnique: jest.Mock<(args: unknown) => Promise<unknown>>;
    create: jest.Mock<(args: unknown) => Promise<unknown>>;
    updateMany: jest.Mock<(args: MutationArgs) => Promise<{ count: number }>>;
  };
  auditLog: {
    create: jest.Mock<(args: AuditCreateArgs) => Promise<unknown>>;
  };
  $transaction: jest.Mock<
    (
      operation: (transaction: PrismaMock) => Promise<unknown>,
    ) => Promise<unknown>
  >;
};

function mockFunction<
  T extends (...args: never[]) => unknown,
>(): jest.MockedFunction<T> {
  return jest.fn() as unknown as jest.MockedFunction<T>;
}

describe('AuthService', () => {
  function authenticatedUser(): AuthenticatedUser {
    return {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.displayName,
      role: userRecord.role,
      isActive: true,
      mustChangePassword: false,
      sessionId: sessionRecord.id,
      sessionExpiresAt: sessionRecord.expiresAt,
    };
  }

  function setup() {
    const calls = {
      userUpdates: [] as MutationArgs[],
      sessionUpdates: [] as MutationArgs[],
      audits: [] as AuditCreateArgs[],
    };
    const transaction =
      mockFunction<
        (
          operation: (transaction: PrismaMock) => Promise<unknown>,
        ) => Promise<unknown>
      >();
    const prisma: PrismaMock = {
      user: {
        findUnique: mockFunction<(args: unknown) => Promise<unknown>>(),
        update: mockFunction<
          (args: MutationArgs) => Promise<unknown>
        >().mockImplementation((args) => {
          calls.userUpdates.push(args);
          return Promise.resolve(userRecord);
        }),
        updateMany: mockFunction<
          (args: MutationArgs) => Promise<{ count: number }>
        >().mockResolvedValue({ count: 1 }),
      },
      authSession: {
        findUnique: mockFunction<(args: unknown) => Promise<unknown>>(),
        create: mockFunction<(args: unknown) => Promise<unknown>>(),
        updateMany: mockFunction<
          (args: MutationArgs) => Promise<{ count: number }>
        >().mockImplementation((args) => {
          calls.sessionUpdates.push(args);
          return Promise.resolve({ count: 1 });
        }),
      },
      auditLog: {
        create: mockFunction<
          (args: AuditCreateArgs) => Promise<unknown>
        >().mockImplementation((args) => {
          calls.audits.push(args);
          return Promise.resolve({});
        }),
      },
      $transaction: transaction,
    };
    transaction.mockImplementation((operation) => operation(prisma));

    const passwordService = {
      validate: jest
        .fn<PasswordService['validate']>()
        .mockReturnValue({ valid: true }),
      hash: jest
        .fn<PasswordService['hash']>()
        .mockResolvedValue('new-password-hash'),
      verify: jest.fn<PasswordService['verify']>(),
    };
    const tokenService = {
      createRefreshToken: jest.fn().mockReturnValue({
        value: `${sessionRecord.id}.new-secret`,
        hash: 'new-refresh-hash',
      }),
      matchesRefreshSecret: jest.fn().mockReturnValue(true),
      issueAccessToken: jest.fn().mockResolvedValue('new-access-token'),
      createCsrfToken: jest.fn().mockReturnValue('new-csrf-token'),
      accessExpiresAt: jest
        .fn()
        .mockReturnValue(new Date(Date.now() + 15 * 60 * 1000)),
    };

    const service = new AuthService(
      prisma as unknown as PrismaService,
      passwordService,
      tokenService as unknown as TokenService,
    );

    return { service, prisma, passwordService, tokenService, calls };
  }

  it('returns generic credentials error and locks on fifth failure', async () => {
    const { service, prisma, passwordService, calls } = setup();
    prisma.user.findUnique.mockResolvedValue(userRecord);
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login(
        { username: 'admin', password: 'WrongPassword123' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    const update = calls.userUpdates.at(-1);
    expect(update?.where).toEqual({ id: userRecord.id });
    expect(update?.data.failedLoginAttempts).toBe(5);
    expect(update?.data.lockedUntil).toBeInstanceOf(Date);
  });

  it('rejects login when credentials changed before session creation', async () => {
    const { service, prisma, passwordService } = setup();
    prisma.user.findUnique.mockResolvedValue(userRecord);
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    passwordService.verify.mockResolvedValue(true);

    await expect(
      service.login(
        { username: 'admin', password: 'StrongPassword123' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  it('rotates refresh hash transactionally', async () => {
    const { service, prisma, calls } = setup();
    prisma.authSession.findUnique.mockResolvedValue(sessionRecord);
    const refreshToken = `${sessionRecord.id}.old-secret`;

    const result = await service.refresh(refreshToken, {
      userAgent: 'test-agent',
    });

    const update = calls.sessionUpdates[0];
    expect(update?.where).toEqual({
      id: sessionRecord.id,
      refreshTokenHash: sessionRecord.refreshTokenHash,
      revokedAt: null,
    });
    expect(typeof update?.data.refreshTokenHash).toBe('string');
    expect(update?.data.lastUsedAt).toBeInstanceOf(Date);
    expect(result.refreshToken).not.toBe(refreshToken);
  });

  it('revokes other sessions when password changes', async () => {
    const { service, prisma, passwordService, calls } = setup();
    prisma.user.findUnique.mockResolvedValue(userRecord);
    passwordService.verify.mockResolvedValue(true);
    const actor = authenticatedUser();

    await service.changePassword(actor, {
      currentPassword: 'StrongPassword123',
      newPassword: 'NewStrongPassword123',
      confirmPassword: 'NewStrongPassword123',
    });

    const revoke = calls.sessionUpdates.find(
      (call) =>
        typeof call.where === 'object' &&
        call.where !== null &&
        'userId' in call.where,
    );
    expect(revoke?.where).toEqual({
      userId: actor.id,
      id: { not: actor.sessionId },
      revokedAt: null,
    });
    expect(revoke?.data.revokedAt).toBeInstanceOf(Date);
  });

  it('rejects inactive users with the generic credentials error', async () => {
    const { service, prisma, passwordService } = setup();
    prisma.user.findUnique.mockResolvedValue({
      ...userRecord,
      isActive: false,
    });
    passwordService.verify.mockResolvedValue(true);

    await expect(
      service.login({ username: 'admin', password: 'StrongPassword123' }, {}),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('resets an expired lock before counting the next failure', async () => {
    const { service, prisma, passwordService } = setup();
    prisma.user.findUnique.mockResolvedValue({
      ...userRecord,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1_000),
    });
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ username: 'admin', password: 'WrongPassword123' }, {}),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userRecord.id },
      data: {
        failedLoginAttempts: 1,
        lockedUntil: null,
      },
    });
  });

  it('revokes an expired refresh session', async () => {
    const { service, prisma, calls } = setup();
    prisma.authSession.findUnique.mockResolvedValue({
      ...sessionRecord,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      service.refresh(`${sessionRecord.id}.old-secret`, {}),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_REFRESH' });
    const revoke = calls.sessionUpdates.at(-1);
    expect(revoke?.where).toEqual({
      id: sessionRecord.id,
      revokedAt: null,
    });
    expect(revoke?.data.revokedAt).toBeInstanceOf(Date);
  });

  it('revokes a session when a stale refresh secret is reused', async () => {
    const { service, prisma, tokenService, calls } = setup();
    prisma.authSession.findUnique.mockResolvedValue(sessionRecord);
    tokenService.matchesRefreshSecret.mockReturnValue(false);

    await expect(
      service.refresh(`${sessionRecord.id}.stale-secret`, {}),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_REFRESH' });
    const revoke = calls.sessionUpdates.at(-1);
    expect(revoke?.where).toEqual({
      id: sessionRecord.id,
      revokedAt: null,
    });
    expect(revoke?.data.revokedAt).toBeInstanceOf(Date);
  });

  it('revokes the current session and audits logout', async () => {
    const { service, calls } = setup();
    const actor = authenticatedUser();

    await service.logout(actor);

    const revoke = calls.sessionUpdates[0];
    expect(revoke?.where).toEqual({
      id: actor.sessionId,
      userId: actor.id,
      revokedAt: null,
    });
    expect(revoke?.data.revokedAt).toBeInstanceOf(Date);
    const audit = calls.audits[0];
    expect(audit?.data.action).toBe('LOGOUT');
    expect(audit?.data.actorId).toBe(actor.id);
  });

  it('rejects a wrong current password without changing credentials', async () => {
    const { service, prisma, passwordService } = setup();
    prisma.user.findUnique.mockResolvedValue(userRecord);
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.changePassword(authenticatedUser(), {
        currentPassword: 'WrongPassword123',
        newPassword: 'NewStrongPassword123',
        confirmPassword: 'NewStrongPassword123',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_CURRENT_PASSWORD_INVALID',
    });
    expect(passwordService.hash).not.toHaveBeenCalled();
  });

  it('never writes password, hash or tokens into the login audit', async () => {
    const { service, prisma, passwordService, calls } = setup();
    prisma.user.findUnique.mockResolvedValue({
      ...userRecord,
      failedLoginAttempts: 0,
    });
    passwordService.verify.mockResolvedValue(true);

    await service.login(
      { username: 'admin', password: 'StrongPassword123' },
      {},
    );

    const auditPayload = JSON.stringify(calls.audits[0]);
    expect(auditPayload).not.toContain('StrongPassword123');
    expect(auditPayload).not.toContain('stored-password-hash');
    expect(auditPayload).not.toContain('new-secret');
    expect(auditPayload).not.toContain('new-access-token');
  });
});
