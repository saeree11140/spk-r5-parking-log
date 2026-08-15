import request, { type Response } from 'supertest';

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

  it('allows STAFF parking mutation but denies user management', async () => {
    const staff = await harness.createUser('STAFF');
    const auth = await harness.login(staff);
    const response = await auth.agent
      .post('/api/houses/R5-163/violations')
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .send({ occurredAt: '2026-07-31T10:00:00+07:00' })
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

  it('locks an account for 15 minutes on the fifth failed login', async () => {
    const staff = await harness.createUser('STAFF');

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(harness.app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', harness.frontendUrl)
        .set('X-Forwarded-For', staff.ipAddress)
        .send({
          username: staff.username,
          password: 'WrongPassword123',
        })
        .expect(401);
    }
    await request(harness.app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', harness.frontendUrl)
      .set('X-Forwarded-For', staff.ipAddress)
      .send({ username: staff.username, password: staff.password })
      .expect(401);

    const locked = await harness.prisma.user.findUniqueOrThrow({
      where: { id: staff.id },
    });
    expect(locked.failedLoginAttempts).toBe(5);
    expect(locked.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
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
