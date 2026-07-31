import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '@spk-r5-parking-log/shared-types';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type { AuthEnvironment } from './auth-environment';
import { AUTH_ENVIRONMENT, type AccessClaims } from './auth.types';

const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(AUTH_ENVIRONMENT)
    private readonly environment: AuthEnvironment,
  ) {}

  async issueAccessToken(
    user: AuthUser,
    sessionId: string,
    sessionExpiresAt: Date,
  ): Promise<string> {
    const accessExpiresAt = this.accessExpiresAt(sessionExpiresAt);
    const exp = Math.floor(accessExpiresAt.getTime() / 1000);

    return this.jwtService.signAsync(
      {
        sub: user.id,
        sid: sessionId,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        exp,
      },
      {
        algorithm: 'HS256',
        secret: this.environment.jwtAccessSecret,
      },
    );
  }

  verifyAccessToken(token: string): Promise<AccessClaims> {
    return this.jwtService.verifyAsync<AccessClaims>(token, {
      algorithms: ['HS256'],
      secret: this.environment.jwtAccessSecret,
    });
  }

  accessExpiresAt(sessionExpiresAt: Date): Date {
    return new Date(
      Math.min(
        Date.now() + ACCESS_TOKEN_LIFETIME_MS,
        sessionExpiresAt.getTime(),
      ),
    );
  }

  createRefreshToken(sessionId: string): {
    value: string;
    hash: string;
  } {
    const secret = randomBytes(32).toString('base64url');

    return {
      value: `${sessionId}.${secret}`,
      hash: this.hashRefreshSecret(secret),
    };
  }

  createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashRefreshSecret(secret: string): string {
    return createHmac('sha256', this.environment.tokenPepper)
      .update(secret)
      .digest('hex');
  }

  matchesRefreshSecret(expectedHash: string, secret: string): boolean {
    const actualHash = this.hashRefreshSecret(secret);
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(actualHash, 'hex');

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
