import type { Request, Response } from 'express';

import type { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthTokens } from './auth.types';
import { DomainError } from '../common/domain-error';
import type { TokenService } from './token.service';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'admin',
  displayName: 'ผู้ดูแลระบบ',
  role: 'ADMIN',
  isActive: true,
  mustChangePassword: false,
  sessionId: '00000000-0000-4000-8000-000000000001',
  sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

const tokens: AuthTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  csrfToken: 'csrf-token',
  accessExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
  sessionExpiresAt: user.sessionExpiresAt,
  user,
};

describe('AuthController', () => {
  function setup() {
    const authService = {
      login: jest.fn().mockResolvedValue(tokens),
      refresh: jest.fn().mockResolvedValue(tokens),
      logout: jest.fn().mockResolvedValue(undefined),
      me: jest.fn().mockReturnValue(user),
      changePassword: jest.fn().mockResolvedValue(tokens),
    };
    const cookieService = {
      setAuthCookies: jest.fn(),
      setCsrfCookie: jest.fn(),
      clearAuthCookies: jest.fn(),
    };
    const tokenService = {
      createCsrfToken: jest.fn().mockReturnValue('renewed-csrf-token'),
    };
    const controller = new AuthController(
      authService as unknown as AuthService,
      cookieService as unknown as AuthCookieService,
      tokenService as unknown as TokenService,
    );

    return { controller, authService, cookieService, tokenService };
  }

  it('sets cookies and returns only the user after login', async () => {
    const { controller, cookieService } = setup();
    const request = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      get: jest.fn().mockReturnValue('test-agent'),
    } as Request;
    const response = {} as Response;

    const result = await controller.login(
      { username: 'admin', password: 'StrongPassword123' },
      request,
      response,
    );

    expect(cookieService.setAuthCookies).toHaveBeenCalledWith(response, tokens);
    expect(result).toEqual({ user });
    expect(JSON.stringify(result)).not.toContain('access-token');
    expect(JSON.stringify(result)).not.toContain('refresh-token');
    expect(JSON.stringify(result)).not.toContain('csrf-token');
  });

  it('revokes the session and clears cookies on logout', async () => {
    const { controller, authService, cookieService } = setup();
    const response = {} as Response;

    await expect(controller.logout(user, response)).resolves.toEqual({
      success: true,
    });
    expect(authService.logout).toHaveBeenCalledWith(user);
    expect(cookieService.clearAuthCookies).toHaveBeenCalledWith(response);
  });

  it('clears stale cookies when refresh fails', async () => {
    const { controller, authService, cookieService } = setup();
    const error = new DomainError(
      401,
      'AUTH_INVALID_REFRESH',
      'invalid refresh',
    );
    authService.refresh.mockRejectedValue(error);
    const request = {
      cookies: { spk_r5_refresh: 'stale-refresh-token' },
      get: jest.fn(),
    } as unknown as Request;
    const response = {} as Response;

    await expect(controller.refresh(request, response)).rejects.toBe(error);
    expect(cookieService.clearAuthCookies).toHaveBeenCalledWith(response);
  });

  it('keeps cookies when refresh fails for a transient server error', async () => {
    const { controller, authService, cookieService } = setup();
    const error = new Error('database unavailable');
    authService.refresh.mockRejectedValue(error);
    const request = {
      cookies: { spk_r5_refresh: 'current-refresh-token' },
      get: jest.fn(),
    } as unknown as Request;
    const response = {} as Response;

    await expect(controller.refresh(request, response)).rejects.toBe(error);
    expect(cookieService.clearAuthCookies).not.toHaveBeenCalled();
  });
});
