import { requireAuthEnvironment } from './auth-environment';

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'development',
  JWT_ACCESS_SECRET: 'j'.repeat(32),
  AUTH_TOKEN_PEPPER: 'p'.repeat(32),
  COOKIE_SECURE: 'false',
  FRONTEND_URL: 'http://localhost:3000',
};

describe('requireAuthEnvironment', () => {
  it('returns normalized authentication settings', () => {
    expect(requireAuthEnvironment(validEnvironment)).toEqual({
      jwtAccessSecret: 'j'.repeat(32),
      tokenPepper: 'p'.repeat(32),
      frontendUrl: 'http://localhost:3000',
      cookieSecure: false,
      trustProxyHops: 0,
    });
  });

  it('rejects secrets shorter than 32 bytes', () => {
    expect(() =>
      requireAuthEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'short',
        AUTH_TOKEN_PEPPER: 'short',
        COOKIE_SECURE: 'true',
        FRONTEND_URL: 'https://admin.example.com',
      }),
    ).toThrow('JWT_ACCESS_SECRET must be at least 32 bytes');
  });

  it('requires secure cookies in production', () => {
    expect(() =>
      requireAuthEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
      }),
    ).toThrow('COOKIE_SECURE must be true in production');
  });

  it('accepts only an explicit bounded trusted proxy hop count', () => {
    expect(
      requireAuthEnvironment({
        ...validEnvironment,
        TRUST_PROXY_HOPS: '1',
      }).trustProxyHops,
    ).toBe(1);
    expect(() =>
      requireAuthEnvironment({
        ...validEnvironment,
        TRUST_PROXY_HOPS: 'all',
      }),
    ).toThrow('TRUST_PROXY_HOPS must be an integer between 0 and 3');
    expect(() =>
      requireAuthEnvironment({
        ...validEnvironment,
        TRUST_PROXY_HOPS: '4',
      }),
    ).toThrow('TRUST_PROXY_HOPS must be an integer between 0 and 3');
  });
});
