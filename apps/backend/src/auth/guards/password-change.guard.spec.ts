import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { PasswordChangeGuard } from './password-change.guard';

describe('PasswordChangeGuard', () => {
  it('blocks protected work until password is changed', () => {
    const request = { user: { mustChangePassword: true } };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    const guard = new PasswordChangeGuard(reflector as unknown as Reflector);

    let thrown: unknown;
    try {
      guard.canActivate(context);
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
    });
  });
});
