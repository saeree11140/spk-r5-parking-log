import { requireDatabaseUrl } from './environment';

describe('requireDatabaseUrl', () => {
  it('returns configured PostgreSQL URL', () => {
    expect(
      requireDatabaseUrl({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      }),
    ).toBe('postgresql://user:password@localhost:5432/database');
  });

  it('throws a descriptive error when DATABASE_URL is missing', () => {
    expect(() => requireDatabaseUrl({})).toThrow(
      'Missing required environment variable: DATABASE_URL',
    );
  });
});
