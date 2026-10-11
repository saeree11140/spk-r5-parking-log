import { randomUUID } from 'node:crypto';
import type { Response } from 'supertest';

import type {
  HouseDetail,
  ViolationCategorySummary,
  ViolationResponse,
} from '@spk-r5-parking-log/shared-types';

import { createAuthTestHarness, type LoggedInAgent } from './auth-test-helpers';

interface ErrorBody {
  code: string;
}

interface MutationBody {
  violation: ViolationResponse;
}

const HOUSE_CODE = 'R5-162';

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

describe('Violation categories (e2e)', () => {
  const harness = createAuthTestHarness();
  const createdIds = new Set<string>();
  let staff: LoggedInAgent;
  let admin: LoggedInAgent;
  let staffId: string;

  beforeAll(async () => {
    await harness.start();
    const staffUser = await harness.createUser('STAFF');
    staffId = staffUser.id;
    staff = await harness.login(staffUser);
    admin = await harness.login(await harness.createUser('ADMIN'));
  });

  afterEach(async () => {
    await harness.cleanupParkingHouse(HOUSE_CODE);
  });

  afterAll(async () => {
    const ids = [...createdIds];
    try {
      await harness.prisma.auditLog.deleteMany({
        where: { entityId: { in: ids } },
      });
      await harness.prisma.violationCategory.deleteMany({
        where: { id: { in: ids } },
      });
    } finally {
      await harness.stop();
    }
  });

  function send(
    auth: LoggedInAgent,
    method: 'post' | 'patch',
    path: string,
    body: object = {},
  ) {
    return auth.agent[method](`/api${path}`)
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .send(body);
  }

  function uniqueName(label: string): string {
    return `${label} ${randomUUID().slice(0, 8)}`;
  }

  async function createCategory(
    auth: LoggedInAgent,
    name: string,
  ): Promise<ViolationCategorySummary> {
    const category = bodyAs<ViolationCategorySummary>(
      await send(auth, 'post', '/violation-categories', { name }).expect(201),
    );
    createdIds.add(category.id);
    return category;
  }

  function createViolation(categoryId: string, day: number) {
    return send(staff, 'post', `/houses/${HOUSE_CODE}/violations`, {
      categoryId,
      occurredAt: `2026-07-${String(day).padStart(2, '0')}T10:00:00+07:00`,
    });
  }

  it('lets STAFF and ADMIN create trimmed categories with an audit entry', async () => {
    const name = uniqueName('Noise');
    const byStaff = await createCategory(staff, `  ${name}  `);
    const byAdmin = await createCategory(admin, uniqueName('Smoke'));

    expect(byStaff).toEqual({ id: byStaff.id, name, isActive: true });
    expect(byAdmin.isActive).toBe(true);
    const audit = await harness.prisma.auditLog.findFirstOrThrow({
      where: {
        entityType: 'ViolationCategory',
        entityId: byStaff.id,
        action: 'CREATE',
      },
    });
    expect(audit).toMatchObject({
      actorId: staffId,
      before: null,
      after: { name, isActive: true },
    });
  });

  it('rejects a duplicate name regardless of case and surrounding spaces', async () => {
    const name = uniqueName('Loud Music');
    await createCategory(staff, name);

    const response = await send(staff, 'post', '/violation-categories', {
      name: `  ${name.toUpperCase()} `,
    }).expect(409);

    expect(bodyAs<ErrorBody>(response).code).toBe('CATEGORY_NAME_TAKEN');
  });

  it('treats visually identical Thai spellings as the same name', async () => {
    const suffix = randomUUID().slice(0, 8);
    await createCategory(staff, `น้ำ ${suffix}`);

    const response = await send(staff, 'post', '/violation-categories', {
      name: `น\u0E49\u0E4D\u0E32 ${suffix}`,
    }).expect(409);

    expect(bodyAs<ErrorBody>(response).code).toBe('CATEGORY_NAME_TAKEN');
  });

  it('accepts a 100-character name whose normalized form is longer', async () => {
    const category = await createCategory(staff, 'İ'.repeat(100));

    expect(category.name).toHaveLength(100);
  });

  it('rejects a blank or overlong name', async () => {
    await send(staff, 'post', '/violation-categories', { name: '   ' }).expect(
      400,
    );
    await send(staff, 'post', '/violation-categories', {
      name: 'x'.repeat(101),
    }).expect(400);
  });

  it('renames a category, audits it, and shows the new name in house history', async () => {
    const category = await createCategory(staff, uniqueName('Trash'));
    await createViolation(category.id, 1).expect(201);
    const newName = uniqueName('Garbage');

    const renamed = bodyAs<ViolationCategorySummary>(
      await send(staff, 'patch', `/violation-categories/${category.id}`, {
        name: newName,
      }).expect(200),
    );

    expect(renamed).toEqual({ ...category, name: newName });
    await expect(
      harness.prisma.auditLog.findFirstOrThrow({
        where: { entityId: category.id, action: 'UPDATE' },
      }),
    ).resolves.toMatchObject({
      before: { name: category.name, isActive: true },
      after: { name: newName, isActive: true },
    });
    const detail = bodyAs<HouseDetail>(
      await staff.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(detail.cycles[0]?.category.name).toBe(newName);
  });

  it('rejects renaming onto another category name', async () => {
    const taken = await createCategory(staff, uniqueName('Taken'));
    const other = await createCategory(staff, uniqueName('Other'));

    const response = await send(
      staff,
      'patch',
      `/violation-categories/${other.id}`,
      { name: taken.name.toLowerCase() },
    ).expect(409);

    expect(bodyAs<ErrorBody>(response).code).toBe('CATEGORY_NAME_TAKEN');
  });

  it('returns 404 for an unknown category', async () => {
    const response = await send(
      staff,
      'post',
      `/violation-categories/${randomUUID()}/deactivate`,
    ).expect(404);

    expect(bodyAs<ErrorBody>(response).code).toBe('CATEGORY_NOT_FOUND');
  });

  it('deactivates and reactivates, treating a repeat as a no-op', async () => {
    const category = await createCategory(staff, uniqueName('Pool'));

    const inactive = bodyAs<ViolationCategorySummary>(
      await send(
        staff,
        'post',
        `/violation-categories/${category.id}/deactivate`,
      ).expect(200),
    );
    await send(
      staff,
      'post',
      `/violation-categories/${category.id}/deactivate`,
    ).expect(200);
    const active = bodyAs<ViolationCategorySummary>(
      await send(
        admin,
        'post',
        `/violation-categories/${category.id}/activate`,
      ).expect(200),
    );

    expect(inactive.isActive).toBe(false);
    expect(active.isActive).toBe(true);
    const actions = await harness.prisma.auditLog.findMany({
      where: { entityId: category.id },
      orderBy: { createdAt: 'asc' },
      select: { action: true },
    });
    expect(actions.map(({ action }) => action)).toEqual([
      'CREATE',
      'DEACTIVATE',
      'ACTIVATE',
    ]);
  });

  it('blocks new violations in an inactive category but keeps its open cycle workable', async () => {
    const category = await createCategory(staff, uniqueName('Gate'));
    const warning = bodyAs<MutationBody>(
      await createViolation(category.id, 1).expect(201),
    );
    const fined = bodyAs<MutationBody>(
      await createViolation(category.id, 2).expect(201),
    );
    await send(
      staff,
      'post',
      `/violation-categories/${category.id}/deactivate`,
    ).expect(200);

    const blocked = await createViolation(category.id, 3).expect(409);
    expect(bodyAs<ErrorBody>(blocked).code).toBe('CATEGORY_INACTIVE');

    await send(
      staff,
      'patch',
      `/houses/${HOUSE_CODE}/violations/${warning.violation.id}`,
      { occurredAt: '2026-07-01T09:00:00+07:00', note: 'still editable' },
    ).expect(200);
    await send(
      staff,
      'post',
      `/houses/${HOUSE_CODE}/violations/${fined.violation.id}/cancel`,
      { reason: 'บันทึกผิดหมวด' },
    ).expect(200);
    const refined = bodyAs<MutationBody>(
      await send(
        staff,
        'post',
        `/houses/${HOUSE_CODE}/violations/${warning.violation.id}/cancel`,
        { reason: 'บันทึกผิดหมวด' },
      ).expect(200),
    );
    expect(refined.violation.status).toBe('CANCELLED');
  });

  it('lets a fine in an inactive category be marked paid', async () => {
    const category = await createCategory(staff, uniqueName('Lobby'));
    await createViolation(category.id, 1).expect(201);
    const fined = bodyAs<MutationBody>(
      await createViolation(category.id, 2).expect(201),
    );
    await send(
      staff,
      'post',
      `/violation-categories/${category.id}/deactivate`,
    ).expect(200);

    await send(
      staff,
      'post',
      `/houses/${HOUSE_CODE}/violations/${fined.violation.id}/mark-paid`,
      { paidAt: '2026-07-03T10:00:00+07:00' },
    ).expect(200);
  });
});
