import type { Response } from 'express';

import type { AuthEnvironment } from './auth-environment';
import { AuthCookieService } from './auth-cookie.service';
import type { AuthTokens } from './auth.types';

const environment: AuthEnvironment = {
  jwtAccessSecret: 'j'.repeat(32),
  tokenPepper: 'p'.repeat(32),
  frontendUrl: 'http://localhost:3000',
  cookieSecure: false,
};

describe('AuthCookieService', () => {
  const service = new AuthCookieService(environment);

  function createResponse() {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;

    return { response, cookie, clearCookie };
  }

  it('sets HttpOnly access and refresh cookies with correct paths', () => {
    const { response, cookie } = createResponse();
    const tokens: AuthTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      accessExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'admin',
        displayName: 'ผู้ดูแลระบบ',
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    };

    service.setAuthCookies(response, tokens);

    expect(cookie).toHaveBeenCalledWith(
      'spk_r5_access',
      tokens.accessToken,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api',
      }),
    );
    expect(cookie).toHaveBeenCalledWith(
      'spk_r5_refresh',
      tokens.refreshToken,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
      }),
    );
    expect(cookie).toHaveBeenCalledWith(
      'spk_r5_csrf',
      tokens.csrfToken,
      expect.objectContaining({
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('clears all cookies with their original paths', () => {
    const { response, clearCookie } = createResponse();

    service.clearAuthCookies(response);

    expect(clearCookie).toHaveBeenCalledWith(
      'spk_r5_access',
      expect.objectContaining({ path: '/api' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'spk_r5_refresh',
      expect.objectContaining({ path: '/api/auth' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'spk_r5_csrf',
      expect.objectContaining({ path: '/' }),
    );
  });
});
