import { requireDatabaseUrl, requireTestDatabaseUrl } from './environment';

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

  it('allows E2E only against a database whose name ends with _test', () => {
    expect(
      requireTestDatabaseUrl({
        DATABASE_URL:
          'postgresql://user:password@localhost:5432/spk_r5_parking_log_test',
      }),
    ).toBe('postgresql://user:password@localhost:5432/spk_r5_parking_log_test');
    expect(() =>
      requireTestDatabaseUrl({
        DATABASE_URL:
          'postgresql://user:password@localhost:5432/spk_r5_parking_log',
      }),
    ).toThrow('E2E database name must end with _test');
  });
});
