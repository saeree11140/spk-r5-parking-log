import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AuthEnvironment } from '../auth-environment';
import { CsrfGuard } from './csrf.guard';

const environment: AuthEnvironment = {
  jwtAccessSecret: 'j'.repeat(32),
  tokenPepper: 'p'.repeat(32),
  frontendUrl: 'https://admin.example.com',
  cookieSecure: true,
};

describe('CsrfGuard', () => {
  function guard() {
    return new CsrfGuard(
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector,
      environment,
    );
  }

  function context(request: object): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('rejects mutation when origin or double-submit token differs', () => {
    const request = {
      method: 'POST',
      path: '/houses/R5-001/violations',
      headers: {
        origin: 'https://evil.example',
        'x-csrf-token': 'header-token',
      },
      cookies: { spk_r5_csrf: 'cookie-token' },
    };
    let thrown: unknown;
    try {
      guard().canActivate(context(request));
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ code: 'CSRF_INVALID' });
  });

  it('allows safe methods without CSRF tokens', () => {
    expect(
      guard().canActivate(context({ method: 'GET', headers: {}, cookies: {} })),
    ).toBe(true);
  });

  it('allows login with exact origin and no existing CSRF cookie', () => {
    expect(
      guard().canActivate(
        context({
          method: 'POST',
          path: '/auth/login',
          headers: { origin: environment.frontendUrl },
          cookies: {},
        }),
      ),
    ).toBe(true);
  });

  it('allows other mutations only when cookie and header match', () => {
    expect(
      guard().canActivate(
        context({
          method: 'POST',
          path: '/auth/refresh',
          headers: {
            origin: environment.frontendUrl,
            'x-csrf-token': 'same-token',
          },
          cookies: { spk_r5_csrf: 'same-token' },
        }),
      ),
    ).toBe(true);
  });
});
