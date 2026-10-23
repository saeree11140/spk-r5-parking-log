import request, { type Response } from 'supertest';

import { unlockUser } from '../src/auth/unlock-user';
import { createAuthTestHarness } from './auth-test-helpers';

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

describe('Authentication and authorization (e2e)', () => {
  const harness = createAuthTestHarness();

  beforeAll(() => harness.start());
  afterEach(() => harness.cleanup());
  afterAll(() => harness.stop());

  it('keeps the HTTP server listening across agent requests', async () => {
    const server = harness.app.getHttpServer() as { listening: boolean };
    expect(server.listening).toBe(true);

    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);
    await auth.agent.get('/api/auth/me').expect(200);

    expect(server.listening).toBe(true);
  });

  it('closes the HTTP server when cleanup fails', async () => {
    const stoppingHarness = createAuthTestHarness();
    await stoppingHarness.start();
    const server = stoppingHarness.app.getHttpServer() as {
      listening: boolean;
    };
    const cleanup = jest
      .spyOn(stoppingHarness, 'cleanup')
      .mockRejectedValueOnce(new Error('cleanup failed'));

    try {
      await expect(stoppingHarness.stop()).rejects.toThrow('cleanup failed');
      expect(server.listening).toBe(false);
    } finally {
      cleanup.mockRestore();
      if (server.listening) await stoppingHarness.stop();
    }
  });

  it('rejects house data without authentication', () =>
    request(harness.app.getHttpServer())
      .get('/api/houses')
      .expect(401)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'AUTH_REQUIRED' }),
      ));

  it('logs in, sets auth cookies and returns current user without secrets', async () => {
    const admin = await harness.createUser('ADMIN');
    const auth = await harness.login(admin);

    expect(auth.setCookies.join(';')).toContain('spk_r5_access=');
    expect(auth.setCookies.join(';')).toContain('spk_r5_refresh=');
    expect(auth.setCookies.join(';')).toContain('HttpOnly');
    const me = await auth.agent.get('/api/auth/me').expect(200);
    const meBody = bodyAs<{
      user: { username: string; [key: string]: unknown };
    }>(me);
    expect(meBody.user.username).toBe(admin.username);
    expect(meBody.user).not.toHaveProperty('passwordHash');
    expect(meBody).not.toHaveProperty('accessToken');
    expect(meBody).not.toHaveProperty('refreshToken');
    expect(meBody).not.toHaveProperty('csrfToken');
  });

  it('rotates refresh token and rejects reuse', async () => {
    const admin = await harness.createUser('ADMIN');
    const first = await harness.login(admin);
    const refreshed = await harness.refresh(first);

    expect(refreshed.refreshCookie).not.toBe(first.refreshCookie);
    await request(harness.app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', first.csrf)
      .set('Cookie', first.cookies.join('; '))
      .expect(401);
  });

  it('rejects a refresh cookie whose session id is not a UUID and clears cookies', async () => {
    const csrf = 'malformed-refresh-csrf-token';

    const response = await request(harness.app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', csrf)
      .set('Cookie', `spk_r5_refresh=not-a-uuid.secret; spk_r5_csrf=${csrf}`)
      .expect(401);

    expect(bodyAs<{ code: string }>(response).code).toBe(
      'AUTH_INVALID_REFRESH',
    );
    const setCookie: unknown = response.headers['set-cookie'];
    expect(setCookie).toEqual(
      expect.arrayContaining([expect.stringMatching(/^spk_r5_refresh=;/)]),
    );
  });

  it('allows STAFF parking mutation but denies user management', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);
    const category = await harness.prisma.violationCategory.findFirstOrThrow({
      where: { name: 'จอดรถผิดระเบียบ' },
    });
    const response = await auth.agent
      .post('/api/houses/R5-163/violations')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .send({
        categoryId: category.id,
        occurredAt: '2026-07-31T10:00:00+07:00',
      })
      .expect(201);

    await auth.agent.get('/api/users').expect(403);
    const mutationBody = bodyAs<{ violation: { id: string } }>(response);
    const audit = await harness.prisma.auditLog.findFirstOrThrow({
      where: {
        entityType: 'ParkingViolation',
        entityId: mutationBody.violation.id,
        action: 'CREATE',
      },
    });
    expect(audit.actorId).toBe(staff.id);
    expect(audit.actorType).toBe('USER');
  });

  it('blocks protected work until the forced password change is complete', async () => {
    const staff = await harness.createUser('STAFF', {
      mustChangePassword: true,
    });
    const auth = await harness.login(staff);

    await auth.agent.get('/api/houses').expect(403);
    await auth.agent.get('/api/auth/me').expect(200);
    await auth.agent
      .post('/api/auth/change-password')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .send({
        currentPassword: staff.password,
        newPassword: 'NewStrongPassword123',
        confirmPassword: 'NewStrongPassword123',
      })
      .expect(201);
    await auth.agent.get('/api/houses').expect(200);
  });

  it('rejects a forced password change that reuses the temporary password', async () => {
    const staff = await harness.createUser('STAFF', {
      mustChangePassword: true,
    });
    const auth = await harness.login(staff);

    const response = await auth.agent
      .post('/api/auth/change-password')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .send({
        currentPassword: staff.password,
        newPassword: staff.password,
        confirmPassword: staff.password,
      })
      .expect(400);

    expect(bodyAs<{ code: string }>(response).code).toBe(
      'AUTH_PASSWORD_REUSED',
    );
    await auth.agent.get('/api/houses').expect(403);
  });

  function attemptLogin(username: string, password: string, ipAddress: string) {
    return request(harness.app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', harness.frontendUrl)
      .set('X-Forwarded-For', ipAddress)
      .send({ username, password });
  }

  async function failLogins(
    username: string,
    ipAddress: string,
    count: number,
  ): Promise<void> {
    for (let attempt = 1; attempt <= count; attempt += 1) {
      await attemptLogin(username, 'WrongPassword123', ipAddress).expect(401);
    }
  }

  it('locks only the failing IP for a user after five failed logins', async () => {
    const staff = await harness.createUser('STAFF');
    const otherIpAddress = '203.0.113.10';

    await failLogins(staff.username, staff.ipAddress, 5);

    const locked = await attemptLogin(
      staff.username,
      staff.password,
      staff.ipAddress,
    ).expect(423);
    expect(bodyAs<{ code: string }>(locked).code).toBe('AUTH_ACCOUNT_LOCKED');
    const wrongPassword = await attemptLogin(
      staff.username,
      'WrongPassword123',
      staff.ipAddress,
    ).expect(401);
    expect(bodyAs<{ code: string }>(wrongPassword).code).toBe(
      'AUTH_INVALID_CREDENTIALS',
    );
    await attemptLogin(staff.username, staff.password, otherIpAddress).expect(
      201,
    );
  });

  function lockAudits(userId: string) {
    return harness.prisma.auditLog.findMany({
      where: { entityType: 'User', entityId: userId, action: 'LOCK' },
    });
  }

  it('audits an IP lock once, on the failure that locks it', async () => {
    const staff = await harness.createUser('STAFF');

    await failLogins(staff.username, staff.ipAddress, 4);
    await expect(lockAudits(staff.id)).resolves.toHaveLength(0);
    await failLogins(staff.username, staff.ipAddress, 1);

    const audits = await lockAudits(staff.id);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorType: 'SYSTEM',
      after: { scope: 'IP', ipAddress: staff.ipAddress },
    });
  });

  it('audits an account-wide lock', async () => {
    const staff = await harness.createUser('STAFF');

    await failLoginsAcrossIps(staff.username, '192.0.5', 4);

    const accountLocks = (await lockAudits(staff.id)).filter(
      (audit) =>
        (audit.after as { scope?: string } | null)?.scope === 'ACCOUNT',
    );
    expect(accountLocks).toHaveLength(1);
  });

  it('clears the IP failure count after a successful login', async () => {
    const staff = await harness.createUser('STAFF');

    await failLogins(staff.username, staff.ipAddress, 4);
    await attemptLogin(staff.username, staff.password, staff.ipAddress).expect(
      201,
    );
    await failLogins(staff.username, staff.ipAddress, 4);
    await attemptLogin(staff.username, staff.password, staff.ipAddress).expect(
      201,
    );
  });

  it('does not track failures for unknown usernames', async () => {
    const ipAddress = '203.0.113.11';

    await failLogins('e2e_unknown_user', ipAddress, 3);

    await expect(
      harness.prisma.loginFailure.count({ where: { ipAddress } }),
    ).resolves.toBe(0);
  });

  async function failLoginsAcrossIps(
    username: string,
    ipPrefix: string,
    ipCount: number,
  ): Promise<void> {
    for (let index = 1; index <= ipCount; index += 1) {
      await failLogins(username, `${ipPrefix}.${index}`, 5);
    }
  }

  it('locks the whole account after twenty failures across IPs in an hour', async () => {
    const staff = await harness.createUser('STAFF');

    await failLoginsAcrossIps(staff.username, '192.0.2', 4);

    const locked = await attemptLogin(
      staff.username,
      staff.password,
      '192.0.2.99',
    ).expect(423);
    expect(bodyAs<{ code: string }>(locked).code).toBe('AUTH_ACCOUNT_LOCKED');
  });

  it('keeps the account-wide count after a successful login', async () => {
    const staff = await harness.createUser('STAFF');

    await failLoginsAcrossIps(staff.username, '192.0.3', 3);
    await attemptLogin(staff.username, staff.password, '192.0.3.50').expect(
      201,
    );
    await failLogins(staff.username, '192.0.3.51', 5);

    await attemptLogin(staff.username, staff.password, '192.0.3.99').expect(
      423,
    );
  });

  it('clears the account-wide lock when an admin resets the password', async () => {
    const admin = await harness.createUser('ADMIN');
    const staff = await harness.createUser('STAFF');
    const adminAuth = await harness.login(admin);
    await failLoginsAcrossIps(staff.username, '192.0.4', 4);

    await adminAuth.agent
      .post(`/api/users/${staff.id}/reset-password`)
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', adminAuth.csrf)
      .send({ temporaryPassword: 'TemporaryPassword123' })
      .expect(201);

    await attemptLogin(
      staff.username,
      'TemporaryPassword123',
      '192.0.4.99',
    ).expect(201);
  });

  it('unlocks every lock of a user from the emergency CLI', async () => {
    const staff = await harness.createUser('STAFF');
    await failLoginsAcrossIps(staff.username, '192.0.6', 4);

    await expect(unlockUser(harness.prisma, staff.username)).resolves.toBe(
      true,
    );

    await attemptLogin(staff.username, staff.password, '192.0.6.1').expect(201);
    const unlocks = await harness.prisma.auditLog.findMany({
      where: { entityType: 'User', entityId: staff.id, action: 'UNLOCK' },
    });
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]?.actorType).toBe('SYSTEM');
  });

  it('reports an unknown username to the emergency CLI', async () => {
    await expect(unlockUser(harness.prisma, 'e2e_missing_user')).resolves.toBe(
      false,
    );
  });

  it('clears IP locks when an admin resets the password', async () => {
    const admin = await harness.createUser('ADMIN');
    const staff = await harness.createUser('STAFF');
    const adminAuth = await harness.login(admin);
    await failLogins(staff.username, staff.ipAddress, 5);

    await adminAuth.agent
      .post(`/api/users/${staff.id}/reset-password`)
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', adminAuth.csrf)
      .send({ temporaryPassword: 'TemporaryPassword123' })
      .expect(201);

    await attemptLogin(
      staff.username,
      'TemporaryPassword123',
      staff.ipAddress,
    ).expect(201);
  });

  it('rejects state changes without matching CSRF tokens', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);

    const response = await auth.agent
      .post('/api/houses/R5-163/violations')
      .set('Origin', harness.frontendUrl)
      .send({ occurredAt: '2026-07-31T10:00:00+07:00' })
      .expect(403);
    expect(bodyAs<{ code: string }>(response).code).toBe('CSRF_INVALID');
  });

  it('renews the CSRF cookie for an authenticated session', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);

    const response = await auth.agent.get('/api/auth/csrf').expect(200);
    const setCookieHeader: unknown = response.headers['set-cookie'];
    const setCookies = Array.isArray(setCookieHeader)
      ? setCookieHeader.filter(
          (value): value is string => typeof value === 'string',
        )
      : typeof setCookieHeader === 'string'
        ? [setCookieHeader]
        : [];
    const csrfCookie =
      setCookies.find((cookie) => cookie.startsWith('spk_r5_csrf=')) ?? '';
    const renewedCsrf = decodeURIComponent(
      csrfCookie.split(';', 1)[0]?.split('=', 2)[1] ?? '',
    );

    expect(renewedCsrf).not.toBe('');
    expect(renewedCsrf).not.toBe(auth.csrf);
    await auth.agent
      .post('/api/houses/R5-163/violations')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', renewedCsrf)
      .send({ occurredAt: 'not-a-date' })
      .expect(400);
  });

  it('revokes the current session on logout', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);

    await auth.agent
      .post('/api/auth/logout')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .expect(201);
    await auth.agent.get('/api/auth/me').expect(401);
  });

  it('revokes other sessions when the password changes', async () => {
    const staff = await harness.createUser('STAFF');
    const first = await harness.login(staff);
    const second = await harness.login(staff);

    await first.agent
      .post('/api/auth/change-password')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', first.csrf)
      .send({
        currentPassword: staff.password,
        newPassword: 'NewStrongPassword123',
        confirmPassword: 'NewStrongPassword123',
      })
      .expect(201);

    await first.agent.get('/api/auth/me').expect(200);
    await second.agent.get('/api/auth/me').expect(401);
  });

  it('throttles repeated current-password guesses on change-password', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);
    const guess = () =>
      auth.agent
        .post('/api/auth/change-password')
        .set('Origin', harness.frontendUrl)
        .set('X-Forwarded-For', staff.ipAddress)
        .set('X-CSRF-Token', auth.csrf)
        .send({
          currentPassword: 'WrongPassword123',
          newPassword: 'NewStrongPassword123',
          confirmPassword: 'NewStrongPassword123',
        });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await guess().expect(401);
    }
    await guess().expect(429);
  });

  it('revokes a session after five wrong current passwords without locking the owner', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);
    const guess = () =>
      auth.agent
        .post('/api/auth/change-password')
        .set('Origin', harness.frontendUrl)
        .set('X-Forwarded-For', staff.ipAddress)
        .set('X-CSRF-Token', auth.csrf)
        .send({
          currentPassword: 'WrongPassword123',
          newPassword: 'NewStrongPassword123',
          confirmPassword: 'NewStrongPassword123',
        });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await guess().expect(401);
      expect(bodyAs<{ code: string }>(response).code).toBe(
        'AUTH_CURRENT_PASSWORD_INVALID',
      );
    }
    const revoked = await guess().expect(401);
    expect(bodyAs<{ code: string }>(revoked).code).toBe('AUTH_REQUIRED');

    await auth.agent.get('/api/auth/me').expect(401);
    await harness.login(staff);
    const audits = await harness.prisma.auditLog.findMany({
      where: { entityType: 'User', entityId: staff.id, action: 'LOCK' },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.after).toMatchObject({ scope: 'SESSION' });
  });

  it('returns the generic credentials error for inactive users', async () => {
    const staff = await harness.createUser('STAFF', { isActive: false });

    const response = await request(harness.app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', harness.frontendUrl)
      .set('X-Forwarded-For', staff.ipAddress)
      .send({ username: staff.username, password: staff.password })
      .expect(401);
    expect(bodyAs<{ code: string }>(response).code).toBe(
      'AUTH_INVALID_CREDENTIALS',
    );
  });
});
