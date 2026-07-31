import type { AuthUser, UserRole } from '@spk-r5-parking-log/shared-types';

export const AUTH_ENVIRONMENT = Symbol('AUTH_ENVIRONMENT');

export interface AuthenticatedUser extends AuthUser {
  sessionId: string;
  sessionExpiresAt: Date;
}

export interface AccessClaims {
  sub: string;
  sid: string;
  role: UserRole;
  mustChangePassword: boolean;
  iat: number;
  exp: number;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  accessExpiresAt: Date;
  sessionExpiresAt: Date;
  user: AuthUser;
}
