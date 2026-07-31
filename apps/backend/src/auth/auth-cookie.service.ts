import { Inject, Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import type { AuthEnvironment } from './auth-environment';
import { AUTH_ENVIRONMENT, type AuthTokens } from './auth.types';

export const ACCESS_COOKIE_NAME = 'spk_r5_access';
export const REFRESH_COOKIE_NAME = 'spk_r5_refresh';
export const CSRF_COOKIE_NAME = 'spk_r5_csrf';

@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(AUTH_ENVIRONMENT)
    private readonly environment: AuthEnvironment,
  ) {}

  setAuthCookies(response: Response, tokens: AuthTokens): void {
    response.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
      ...this.cookieOptions('/api', true),
      maxAge: this.maxAge(tokens.accessExpiresAt),
    });
    response.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...this.cookieOptions('/api/auth', true),
      maxAge: this.maxAge(tokens.sessionExpiresAt),
    });
    response.cookie(CSRF_COOKIE_NAME, tokens.csrfToken, {
      ...this.cookieOptions('/', false),
      maxAge: this.maxAge(tokens.sessionExpiresAt),
    });
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(ACCESS_COOKIE_NAME, this.cookieOptions('/api', true));
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      this.cookieOptions('/api/auth', true),
    );
    response.clearCookie(CSRF_COOKIE_NAME, this.cookieOptions('/', false));
  }

  private cookieOptions(path: string, httpOnly: boolean): CookieOptions {
    return {
      httpOnly,
      sameSite: 'lax',
      secure: this.environment.cookieSecure,
      path,
    };
  }

  private maxAge(expiresAt: Date): number {
    return Math.max(0, expiresAt.getTime() - Date.now());
  }
}
