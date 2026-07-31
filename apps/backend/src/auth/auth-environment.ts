export interface AuthEnvironment {
  jwtAccessSecret: string;
  tokenPepper: string;
  frontendUrl: string;
  cookieSecure: boolean;
  trustProxyHops: number;
}

export function requireAuthEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): AuthEnvironment {
  const jwtAccessSecret = environment.JWT_ACCESS_SECRET?.trim() ?? '';
  const tokenPepper = environment.AUTH_TOKEN_PEPPER?.trim() ?? '';
  const frontendUrl = environment.FRONTEND_URL?.trim() ?? '';
  const cookieSecure = environment.COOKIE_SECURE === 'true';
  const trustProxyValue = environment.TRUST_PROXY_HOPS?.trim() || '0';
  const trustProxyHops = Number(trustProxyValue);

  if (Buffer.byteLength(jwtAccessSecret) < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 bytes');
  }
  if (Buffer.byteLength(tokenPepper) < 32) {
    throw new Error('AUTH_TOKEN_PEPPER must be at least 32 bytes');
  }
  if (!frontendUrl) {
    throw new Error('Missing required environment variable: FRONTEND_URL');
  }
  if (environment.NODE_ENV === 'production' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true in production');
  }
  if (
    !/^\d+$/.test(trustProxyValue) ||
    !Number.isInteger(trustProxyHops) ||
    trustProxyHops < 0 ||
    trustProxyHops > 3
  ) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 3');
  }

  return {
    jwtAccessSecret,
    tokenPepper,
    frontendUrl,
    cookieSecure,
    trustProxyHops,
  };
}
