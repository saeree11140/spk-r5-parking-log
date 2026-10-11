import type { Response } from 'supertest';

import type {
  HouseDetail,
  HouseSummary,
  ViolationCategorySummary,
  ViolationResponse,
} from '@spk-r5-parking-log/shared-types';

import { PrismaService } from '../src/database/prisma.service';
import { createAuthTestHarness, type LoggedInAgent } from './auth-test-helpers';

interface MutationBody {
  violation: ViolationResponse;
  currentCycle: {
    id: string;
    cycleNumber: number;
    violationCount: number;
    pendingFineCount: number;
    pendingAmountBaht: number;
    fineRuleVersion: 'V1' | 'V2';
    category: ViolationCategorySummary;
  };
}

interface PaidBody {
  fine: { status: string; paidAt: string | null };
  violation: ViolationResponse;
  cycleClosed: boolean;
}

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
}

const HOUSE_CODE = 'R5-164';
const PARKING_CATEGORY = 'จอดรถผิดระเบียบ';
const PET_CATEGORY = 'ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ';
const occurredAt = [
  '2026-07-01T10:00:00+07:00',
  '2026-07-02T10:00:00+07:00',
  '2026-07-03T10:00:00+07:00',
  '2026-07-04T10:00:00+07:00',
  '2026-07-05T10:00:00+07:00',
];

function bodyAs<T>(response: Response): T {
  return response.body as T;
}

describe('Core parking API (e2e)', () => {
  const harness = createAuthTestHarness();
  let prisma: PrismaService;
  let auth: LoggedInAgent;
  let parkingId: string;
  let petId: string;

  beforeAll(async () => {
    await harness.start();
    prisma = harness.prisma;
    auth = await harness.login(await harness.createUser('STAFF'));
    const categories = bodyAs<ViolationCategorySummary[]>(
      await auth.agent.get('/api/violation-categories').expect(200),
    );
    const categoryId = (name: string) => {
      const category = categories.find((item) => item.name === name);
      if (!category) throw new Error(`Missing seeded category ${name}`);
      return category.id;
    };
    parkingId = categoryId(PARKING_CATEGORY);
    petId = categoryId(PET_CATEGORY);
  });

  beforeEach(async () => resetHouse());

  afterAll(async () => {
    await resetHouse();
    await harness.stop();
  });

  async function resetHouse(): Promise<void> {
    if (!prisma) return;
    const house = await prisma.house.findUniqueOrThrow({
      where: { code: HOUSE_CODE },
      include: {
        cycles: {
          include: {
            violations: { include: { fine: true, evidence: true } },
          },
        },
      },
    });
    const entityIds = house.cycles.flatMap((cycle) => [
      cycle.id,
      ...cycle.violations.flatMap((violation) => [
        violation.id,
        ...(violation.fine ? [violation.fine.id] : []),
      ]),
    ]);
    if (entityIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: entityIds } },
      });
    }
    await prisma.evidence.deleteMany({
      where: { violation: { cycle: { houseId: house.id } } },
    });
    await prisma.fine.deleteMany({
      where: { violation: { cycle: { houseId: house.id } } },
    });
    await prisma.parkingViolation.deleteMany({
      where: { cycle: { houseId: house.id } },
    });
    await prisma.violationCycle.deleteMany({ where: { houseId: house.id } });
  }

  async function createViolation(
    index: number,
    categoryId = parkingId,
  ): Promise<Response> {
    return mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({
        categoryId,
        occurredAt: occurredAt[index],
        note: `violation ${index + 1}`,
      })
      .expect(201);
  }

  function mutation(path: string) {
    return auth.agent
      .post(path)
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf);
  }

  function patch(path: string) {
    return auth.agent
      .patch(path)
      .set('Origin', harness.frontendUrl)
      .set('X-CSRF-Token', auth.csrf);
  }

  async function createFive(): Promise<MutationBody[]> {
    const bodies: MutationBody[] = [];
    for (let index = 0; index < 5; index += 1) {
      bodies.push(bodyAs<MutationBody>(await createViolation(index)));
    }
    return bodies;
  }

  it('lists 164 houses and returns summary instead of full history', async () => {
    const response = await auth.agent.get('/api/houses').expect(200);
    const houses = bodyAs<HouseSummary[]>(response);

    expect(houses).toHaveLength(164);
    expect(houses[0]?.code).toBe('R5-001');
    expect(houses[163]?.code).toBe(HOUSE_CODE);
    expect(houses[163]).not.toHaveProperty('cycles');
    expect(houses[163]?.currentCycles).toEqual([]);
  });

  it('lists the seeded violation categories', async () => {
    const categories = bodyAs<ViolationCategorySummary[]>(
      await auth.agent.get('/api/violation-categories').expect(200),
    );

    expect(categories).toEqual(
      expect.arrayContaining([
        { id: parkingId, name: PARKING_CATEGORY, isActive: true },
        { id: petId, name: PET_CATEGORY, isActive: true },
      ]),
    );
  });

  it('counts each category separately for the same house', async () => {
    const parkingFirst = bodyAs<MutationBody>(await createViolation(0));
    const petFirst = bodyAs<MutationBody>(await createViolation(1, petId));
    const parkingSecond = bodyAs<MutationBody>(await createViolation(2));

    expect(parkingFirst.violation).toMatchObject({
      sequenceNumber: 1,
      status: 'WARNING',
      fine: null,
    });
    expect(petFirst.violation).toMatchObject({
      sequenceNumber: 1,
      status: 'WARNING',
      fine: null,
    });
    expect(petFirst.currentCycle.category).toEqual({
      id: petId,
      name: PET_CATEGORY,
      isActive: true,
    });
    expect(parkingSecond.violation.fine?.amountBaht).toBe(1000);
    expect(parkingSecond.currentCycle.category.id).toBe(parkingId);

    const houses = bodyAs<HouseSummary[]>(
      await auth.agent.get('/api/houses').expect(200),
    );
    const house = houses.find(({ code }) => code === HOUSE_CODE);
    expect(
      house?.currentCycles.map(
        ({ category, violationCount, pendingAmountBaht }) => ({
          categoryId: category.id,
          violationCount,
          pendingAmountBaht,
        }),
      ),
    ).toEqual([
      { categoryId: parkingId, violationCount: 2, pendingAmountBaht: 1000 },
      { categoryId: petId, violationCount: 1, pendingAmountBaht: 0 },
    ]);
  });

  it('closes only the paid category cycle and keeps backdating other categories', async () => {
    await createViolation(0, petId);
    await createViolation(1);
    const parkingFined = bodyAs<MutationBody>(await createViolation(2));

    const paid = bodyAs<PaidBody>(
      await mutation(
        `/api/houses/${HOUSE_CODE}/violations/${parkingFined.violation.id}/mark-paid`,
      )
        .send({ paidAt: '2026-07-06T10:00:00+07:00' })
        .expect(200),
    );
    expect(paid.cycleClosed).toBe(true);

    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(
      detail.cycles.map(({ category, status }) => ({
        categoryId: category.id,
        status,
      })),
    ).toEqual(
      expect.arrayContaining([
        { categoryId: parkingId, status: 'CLOSED' },
        { categoryId: petId, status: 'OPEN' },
      ]),
    );

    const petBackdated = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({ categoryId: petId, occurredAt: '2026-06-30T10:00:00+07:00' })
        .expect(201),
    );
    expect(petBackdated.violation.sequenceNumber).toBe(1);
    expect(petBackdated.currentCycle.violationCount).toBe(2);

    const parkingNext = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({
          categoryId: parkingId,
          occurredAt: '2026-07-09T10:00:00+07:00',
        })
        .expect(201),
    );
    expect(parkingNext.currentCycle.cycleNumber).toBe(2);
    expect(parkingNext.violation.sequenceNumber).toBe(1);
  });

  it('requires an existing category to create a violation', async () => {
    const missing = await mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({ occurredAt: occurredAt[0] })
      .expect(400);
    expect(bodyAs<ErrorBody>(missing).code).toBe('VALIDATION_ERROR');

    const unknown = await mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({
        categoryId: '7a4b3c2d-1e0f-4a1b-8c2d-3e4f5a6b7c8d',
        occurredAt: occurredAt[0],
      })
      .expect(404);
    expect(bodyAs<ErrorBody>(unknown).code).toBe('CATEGORY_NOT_FOUND');
  });

  it('does not allow changing the category of a violation', async () => {
    const created = bodyAs<MutationBody>(await createViolation(0));

    const response = await patch(
      `/api/houses/${HOUSE_CODE}/violations/${created.violation.id}`,
    )
      .send({ occurredAt: occurredAt[0], categoryId: petId })
      .expect(400);
    expect(bodyAs<ErrorBody>(response).code).toBe('VALIDATION_ERROR');
  });

  async function openV1Cycle(): Promise<void> {
    const house = await prisma.house.findUniqueOrThrow({
      where: { code: HOUSE_CODE },
    });
    await prisma.violationCycle.create({
      data: {
        houseId: house.id,
        categoryId: parkingId,
        cycleNumber: 1,
        fineRuleVersion: 'V1',
      },
    });
  }

  it('creates sequence 1-5 in a new V2 cycle with fines 0,1000,500,500,500 and total 2500', async () => {
    const created = await createFive();

    expect(created.map(({ violation }) => violation.sequenceNumber)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(
      created.map(({ violation }) => violation.fine?.amountBaht ?? 0),
    ).toEqual([0, 1000, 500, 500, 500]);
    expect(created[0]?.currentCycle.fineRuleVersion).toBe('V2');

    const detailResponse = await auth.agent
      .get(`/api/houses/${HOUSE_CODE}`)
      .expect(200);
    const detail = bodyAs<HouseDetail>(detailResponse);
    expect(detail.cycles[0]?.fineRuleVersion).toBe('V2');
    expect(detail.cycles[0]?.totalFineAmountBaht).toBe(2500);
    expect(detail.cycles[0]?.pendingFineCount).toBe(4);
  });

  it('keeps an open V1 cycle on the original fines 0,0,1000', async () => {
    await openV1Cycle();

    const created = [
      bodyAs<MutationBody>(await createViolation(0)),
      bodyAs<MutationBody>(await createViolation(1)),
      bodyAs<MutationBody>(await createViolation(2)),
    ];

    expect(
      created.map(({ violation }) => violation.fine?.amountBaht ?? 0),
    ).toEqual([0, 0, 1000]);
    expect(created[2]?.currentCycle.fineRuleVersion).toBe('V1');
  });

  it('resequences a V1 cycle with V1 fines after a cancel', async () => {
    await openV1Cycle();
    await createViolation(0);
    const second = bodyAs<MutationBody>(await createViolation(1));
    const third = bodyAs<MutationBody>(await createViolation(2));
    expect(third.violation.fine?.amountBaht).toBe(1000);

    await mutation(
      `/api/houses/${HOUSE_CODE}/violations/${second.violation.id}/cancel`,
    )
      .send({ reason: 'บันทึกผิด' })
      .expect(200);

    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    const resequenced = detail.cycles[0]?.violations.find(
      ({ id }) => id === third.violation.id,
    );
    expect(resequenced).toMatchObject({
      sequenceNumber: 2,
      status: 'WARNING',
      fine: { amountBaht: 0, status: 'CANCELLED' },
    });
    expect(detail.cycles[0]?.pendingAmountBaht).toBe(0);
  });

  it('opens a V2 cycle after a V1 cycle closes', async () => {
    await openV1Cycle();
    await createViolation(0);
    await createViolation(1);
    const fined = bodyAs<MutationBody>(await createViolation(2));

    const paid = bodyAs<PaidBody>(
      await mutation(
        `/api/houses/${HOUSE_CODE}/violations/${fined.violation.id}/mark-paid`,
      )
        .send({ paidAt: '2026-07-06T10:00:00+07:00' })
        .expect(200),
    );
    expect(paid.cycleClosed).toBe(true);

    const first = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({
          categoryId: parkingId,
          occurredAt: '2026-07-09T10:00:00+07:00',
        })
        .expect(201),
    );
    const second = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({
          categoryId: parkingId,
          occurredAt: '2026-07-10T10:00:00+07:00',
        })
        .expect(201),
    );
    expect(second.currentCycle).toMatchObject({
      cycleNumber: 2,
      fineRuleVersion: 'V2',
    });
    expect(first.violation.fine).toBeNull();
    expect(second.violation.fine?.amountBaht).toBe(1000);
  });

  it('marks fines independently, closes on final fine, then opens cycle two', async () => {
    const created = await createFive();
    const fined = created.slice(1);

    for (let index = 0; index < fined.length; index += 1) {
      const response = await mutation(
        `/api/houses/${HOUSE_CODE}/violations/${fined[index]?.violation.id}/mark-paid`,
      )
        .send({
          paidAt: `2026-07-${String(6 + index).padStart(2, '0')}T10:00:00+07:00`,
          reference: `receipt-${index + 1}`,
        })
        .expect(200);
      const body = bodyAs<PaidBody>(response);
      expect(body.fine.status).toBe('PAID');
      expect(body.cycleClosed).toBe(index === fined.length - 1);
    }

    const next = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({
          categoryId: parkingId,
          occurredAt: '2026-07-11T10:00:00+07:00',
        })
        .expect(201),
    );
    expect(next.currentCycle.cycleNumber).toBe(2);
    expect(next.violation.sequenceNumber).toBe(1);
  });

  it('allows backdate and cancel before paid then recalculates fines', async () => {
    await mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({ categoryId: parkingId, occurredAt: occurredAt[1] })
      .expect(201);
    const backdated = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({ categoryId: parkingId, occurredAt: occurredAt[0] })
        .expect(201),
    );
    expect(backdated.violation.sequenceNumber).toBe(1);

    const third = bodyAs<MutationBody>(await createViolation(2));
    const cancelled = bodyAs<MutationBody>(
      await mutation(
        `/api/houses/${HOUSE_CODE}/violations/${backdated.violation.id}/cancel`,
      )
        .send({ reason: 'บันทึกผิดหลัง' })
        .expect(200),
    );
    expect(cancelled.violation.status).toBe('CANCELLED');
    expect(cancelled.currentCycle.violationCount).toBe(2);
    expect(third.violation.fine?.amountBaht).toBe(500);

    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(
      detail.cycles[0]?.violations.find(({ id }) => id === third.violation.id)
        ?.fine?.amountBaht,
    ).toBe(1000);
    expect(detail.cycles[0]?.pendingAmountBaht).toBe(1000);
  });

  it('edits a violation, reorders its cycle, recalculates fines, and persists the result', async () => {
    const violations = [
      bodyAs<MutationBody>(await createViolation(0)),
      bodyAs<MutationBody>(await createViolation(1)),
      bodyAs<MutationBody>(await createViolation(2)),
    ];
    const earliestOccurredAt = '2026-06-30T09:00:00+07:00';

    const response = await patch(
      `/api/houses/${HOUSE_CODE}/violations/${violations[2].violation.id}`,
    )
      .send({
        occurredAt: earliestOccurredAt,
        note: 'corrected third violation',
      })
      .expect(200);
    const updated = bodyAs<MutationBody>(response);

    expect(updated.violation).toMatchObject({
      id: violations[2].violation.id,
      sequenceNumber: 1,
      occurredAt: new Date(earliestOccurredAt).toISOString(),
      status: 'WARNING',
      note: 'corrected third violation',
      fine: { amountBaht: 0, status: 'CANCELLED' },
    });
    expect(updated.currentCycle).toMatchObject({
      violationCount: 3,
      pendingFineCount: 2,
      pendingAmountBaht: 1500,
    });

    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(
      detail.cycles[0]?.violations.map(
        ({ id, sequenceNumber, occurredAt, status, note, fine }) => ({
          id,
          sequenceNumber,
          occurredAt,
          status,
          note,
          fine: fine
            ? { status: fine.status, amountBaht: fine.amountBaht }
            : null,
        }),
      ),
    ).toEqual([
      {
        id: violations[2].violation.id,
        sequenceNumber: 1,
        occurredAt: new Date(earliestOccurredAt).toISOString(),
        status: 'WARNING',
        note: 'corrected third violation',
        fine: { status: 'CANCELLED', amountBaht: 0 },
      },
      {
        id: violations[0].violation.id,
        sequenceNumber: 2,
        occurredAt: new Date(occurredAt[0]).toISOString(),
        status: 'PENDING_FINE',
        note: 'violation 1',
        fine: { status: 'PENDING', amountBaht: 1000 },
      },
      {
        id: violations[1].violation.id,
        sequenceNumber: 3,
        occurredAt: new Date(occurredAt[1]).toISOString(),
        status: 'PENDING_FINE',
        note: 'violation 2',
        fine: { status: 'PENDING', amountBaht: 500 },
      },
    ]);

    const cancelledFineId = violations[2].violation.fine?.id;
    expect(cancelledFineId).toBeDefined();
    if (!cancelledFineId) throw new Error('Expected original fine');
    const cancelledFineAudits = await prisma.auditLog.findMany({
      where: {
        action: 'UPDATE',
        entityId: cancelledFineId,
        entityType: 'Fine',
      },
    });
    expect(cancelledFineAudits).toEqual([
      expect.objectContaining({
        after: { amountBaht: 0, status: 'CANCELLED' },
        before: { amountBaht: 500, status: 'PENDING' },
      }),
    ]);

    const pendingFine = detail.cycles[0]?.violations.find(
      ({ id }) => id === violations[0].violation.id,
    )?.fine;
    expect(pendingFine).not.toBeNull();
    if (!pendingFine) throw new Error('Expected replacement pending fine');
    const pendingFineAudits = await prisma.auditLog.findMany({
      where: {
        action: 'CREATE',
        entityId: pendingFine.id,
        entityType: 'Fine',
      },
    });
    expect(pendingFineAudits).toEqual([
      expect.objectContaining({
        after: { amountBaht: 1000, status: 'PENDING' },
        before: null,
      }),
    ]);
  });

  it('preserves an existing note when the HTTP patch omits note', async () => {
    const created = bodyAs<MutationBody>(await createViolation(0));

    const response = await patch(
      `/api/houses/${HOUSE_CODE}/violations/${created.violation.id}`,
    )
      .send({ occurredAt: occurredAt[0] })
      .expect(200);

    expect(bodyAs<MutationBody>(response).violation.note).toBe('violation 1');
    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(detail.cycles[0]?.violations[0]?.note).toBe('violation 1');
  });

  it('clears an existing note when an edit supplies a blank note', async () => {
    const created = bodyAs<MutationBody>(await createViolation(0));

    const response = await patch(
      `/api/houses/${HOUSE_CODE}/violations/${created.violation.id}`,
    )
      .send({ occurredAt: occurredAt[0], note: '   ' })
      .expect(200);

    expect(bodyAs<MutationBody>(response).violation.note).toBeNull();
    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(detail.cycles[0]?.violations[0]?.note).toBeNull();
  });

  it('rejects an edit to a cancelled violation', async () => {
    const created = bodyAs<MutationBody>(await createViolation(0));
    await mutation(
      `/api/houses/${HOUSE_CODE}/violations/${created.violation.id}/cancel`,
    )
      .send({ reason: 'entered by mistake' })
      .expect(200);

    const response = await patch(
      `/api/houses/${HOUSE_CODE}/violations/${created.violation.id}`,
    )
      .send({ occurredAt: occurredAt[1], note: 'cannot restore by editing' })
      .expect(409);

    expect(bodyAs<ErrorBody>(response).code).toBe(
      'VIOLATION_ALREADY_CANCELLED',
    );
  });

  it('rejects an edit when its cycle contains a paid fine', async () => {
    const violations = await createFive();
    const payment = bodyAs<PaidBody>(
      await mutation(
        `/api/houses/${HOUSE_CODE}/violations/${violations[2].violation.id}/mark-paid`,
      )
        .send({
          paidAt: '2026-07-06T10:00:00+07:00',
          reference: 'receipt-1',
        })
        .expect(200),
    );
    expect(payment.cycleClosed).toBe(false);
    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(detail.cycles[0]?.status).toBe('OPEN');

    const response = await patch(
      `/api/houses/${HOUSE_CODE}/violations/${violations[0].violation.id}`,
    )
      .send({ occurredAt: '2026-06-30T09:00:00+07:00', note: 'blocked' })
      .expect(409);

    expect(bodyAs<ErrorBody>(response).code).toBe('PAID_CYCLE_IMMUTABLE');
  });

  it('blocks cancel and backdate after paid without writing rollback audit', async () => {
    const created = await createFive();
    await mutation(
      `/api/houses/${HOUSE_CODE}/violations/${created[2]?.violation.id}/mark-paid`,
    )
      .send({ paidAt: '2026-07-06T10:00:00+07:00' })
      .expect(200);
    const beforeAuditCount = await prisma.auditLog.count();

    const cancelResponse = await mutation(
      `/api/houses/${HOUSE_CODE}/violations/${created[0]?.violation.id}/cancel`,
    )
      .send({ reason: 'บันทึกผิดหลัง' })
      .expect(409);
    expect(bodyAs<ErrorBody>(cancelResponse).code).toBe('PAID_CYCLE_IMMUTABLE');

    const backdateResponse = await mutation(
      `/api/houses/${HOUSE_CODE}/violations`,
    )
      .send({ categoryId: parkingId, occurredAt: '2026-06-30T10:00:00+07:00' })
      .expect(409);
    expect(bodyAs<ErrorBody>(backdateResponse).code).toBe(
      'BACKDATE_NOT_ALLOWED',
    );
    await expect(prisma.auditLog.count()).resolves.toBe(beforeAuditCount);
  });

  it('rejects invalid and unknown fields with stable validation envelope', async () => {
    const response = await mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({ categoryId: parkingId, occurredAt: 'invalid', amountBaht: 1 })
      .expect(400);
    const body = bodyAs<ErrorBody>(response);

    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('serializes parallel creates without duplicate cycle or sequence', async () => {
    const responses = await Promise.all(
      occurredAt.slice(0, 4).map((timestamp) =>
        mutation(`/api/houses/${HOUSE_CODE}/violations`).send({
          categoryId: parkingId,
          occurredAt: timestamp,
        }),
      ),
    );
    const statuses = responses.map(({ status }) => status);
    expect(statuses.every((status) => status === 201 || status === 409)).toBe(
      true,
    );
    for (const response of responses.filter(({ status }) => status === 409)) {
      expect(bodyAs<ErrorBody>(response).code).toBe('CONCURRENT_MODIFICATION');
    }

    const house = await prisma.house.findUniqueOrThrow({
      where: { code: HOUSE_CODE },
      include: { cycles: { include: { violations: true } } },
    });
    expect(house.cycles).toHaveLength(1);
    const successCount = statuses.filter((status) => status === 201).length;
    expect(
      house.cycles[0]?.violations
        .map(({ sequenceNumber }) => sequenceNumber)
        .sort((left, right) => (left ?? 0) - (right ?? 0)),
    ).toEqual(Array.from({ length: successCount }, (_, index) => index + 1));
  });
});
