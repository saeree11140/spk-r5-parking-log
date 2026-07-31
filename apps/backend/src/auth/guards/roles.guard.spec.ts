import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('requires ADMIN metadata', () => {
    const request = { user: { role: 'STAFF' } };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    let thrown: unknown;
    try {
      guard.canActivate(context);
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ code: 'AUTH_FORBIDDEN' });
  });
});
