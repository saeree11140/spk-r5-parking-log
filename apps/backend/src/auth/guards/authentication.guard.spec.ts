import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { PrismaService } from '../../database/prisma.service';
import type { TokenService } from '../token.service';
import { AuthenticationGuard } from './authentication.guard';

describe('AuthenticationGuard', () => {
  it('loads current session and user instead of trusting JWT role', async () => {
    const request = {
      cookies: { spk_r5_access: 'access-token' },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    const tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({
        sub: 'user-id',
        sid: 'session-id',
        role: 'ADMIN',
      }),
    };
    const prisma = {
      authSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-id',
          expiresAt: new Date(Date.now() + 60_000),
          user: {
            id: 'user-id',
            username: 'staff',
            displayName: 'เจ้าหน้าที่',
            role: 'STAFF',
            isActive: true,
            mustChangePassword: false,
          },
        }),
      },
    };
    const guard = new AuthenticationGuard(
      reflector as unknown as Reflector,
      tokenService as unknown as TokenService,
      prisma as unknown as PrismaService,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(
      (request as typeof request & { user: { role: string } }).user.role,
    ).toBe('STAFF');
  });
});
