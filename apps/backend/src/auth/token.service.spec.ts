import { JwtService } from '@nestjs/jwt';

import type { AuthEnvironment } from './auth-environment';
import { TokenService } from './token.service';

const environment: AuthEnvironment = {
  jwtAccessSecret: 'j'.repeat(32),
  tokenPepper: 'p'.repeat(32),
  frontendUrl: 'http://localhost:3000',
  cookieSecure: false,
};

const user = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'admin',
  displayName: 'ผู้ดูแลระบบ',
  role: 'ADMIN' as const,
  isActive: true,
  mustChangePassword: false,
};

describe('TokenService', () => {
  const service = new TokenService(new JwtService(), environment);

  it('creates sessionId.secret refresh tokens and stores only HMAC hash', () => {
    const token = service.createRefreshToken(
      '00000000-0000-4000-8000-000000000001',
    );
    const [sessionId, secret] = token.value.split('.');

    expect(sessionId).toBe('00000000-0000-4000-8000-000000000001');
    expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
    expect(token.hash).toBe(service.hashRefreshSecret(secret));
    expect(token.hash).not.toContain(secret);
    expect(service.matchesRefreshSecret(token.hash, secret)).toBe(true);
    expect(service.matchesRefreshSecret(token.hash, `${secret}x`)).toBe(false);
  });

  it('caps access expiry at the session expiry', async () => {
    const sessionExpiresAt = new Date(Date.now() + 60_000);

    const jwt = await service.issueAccessToken(
      user,
      '00000000-0000-4000-8000-000000000001',
      sessionExpiresAt,
    );
    const claims = await service.verifyAccessToken(jwt);

    expect(claims.sub).toBe(user.id);
    expect(claims.sid).toBe('00000000-0000-4000-8000-000000000001');
    expect(claims.exp * 1000).toBeLessThanOrEqual(sessionExpiresAt.getTime());
  });
});
