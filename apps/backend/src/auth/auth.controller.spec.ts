import type { Request, Response } from 'express';

import type { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthTokens } from './auth.types';

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
      clearAuthCookies: jest.fn(),
    };
    const controller = new AuthController(
      authService as unknown as AuthService,
      cookieService as unknown as AuthCookieService,
    );

    return { controller, authService, cookieService };
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
});
