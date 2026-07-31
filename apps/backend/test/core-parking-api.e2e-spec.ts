import type { Response } from 'supertest';

import type {
  HouseDetail,
  HouseSummary,
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

  beforeAll(async () => {
    await harness.start();
    prisma = harness.prisma;
    auth = await harness.login(await harness.createUser('STAFF'));
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

  async function createViolation(index: number): Promise<Response> {
    return mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({ occurredAt: occurredAt[index], note: `violation ${index + 1}` })
      .expect(201);
  }

  function mutation(path: string) {
    return auth.agent
      .post(path)
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
  });

  it('creates sequence 1-5 with fines 0,0,1000,500,500 and total 2000', async () => {
    const created = await createFive();

    expect(created.map(({ violation }) => violation.sequenceNumber)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(
      created.map(({ violation }) => violation.fine?.amountBaht ?? 0),
    ).toEqual([0, 0, 1000, 500, 500]);

    const detailResponse = await auth.agent
      .get(`/api/houses/${HOUSE_CODE}`)
      .expect(200);
    const detail = bodyAs<HouseDetail>(detailResponse);
    expect(detail.cycles[0]?.totalFineAmountBaht).toBe(2000);
    expect(detail.cycles[0]?.pendingFineCount).toBe(3);
  });

  it('marks fines independently, closes on final fine, then opens cycle two', async () => {
    const created = await createFive();
    const fined = created.slice(2);

    for (let index = 0; index < fined.length; index += 1) {
      const response = await mutation(
        `/api/houses/${HOUSE_CODE}/violations/${fined[index]?.violation.id}/mark-paid`,
      )
        .send({
          paidAt: `2026-07-0${6 + index}T10:00:00+07:00`,
          reference: `receipt-${index + 1}`,
        })
        .expect(200);
      const body = bodyAs<PaidBody>(response);
      expect(body.fine.status).toBe('PAID');
      expect(body.cycleClosed).toBe(index === fined.length - 1);
    }

    const next = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({ occurredAt: '2026-07-09T10:00:00+07:00' })
        .expect(201),
    );
    expect(next.currentCycle.cycleNumber).toBe(2);
    expect(next.violation.sequenceNumber).toBe(1);
  });

  it('allows backdate and cancel before paid then recalculates fines', async () => {
    await mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({ occurredAt: occurredAt[1] })
      .expect(201);
    const backdated = bodyAs<MutationBody>(
      await mutation(`/api/houses/${HOUSE_CODE}/violations`)
        .send({ occurredAt: occurredAt[0] })
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
    expect(third.violation.fine?.amountBaht).toBe(1000);

    const detail = bodyAs<HouseDetail>(
      await auth.agent.get(`/api/houses/${HOUSE_CODE}`).expect(200),
    );
    expect(detail.cycles[0]?.pendingAmountBaht).toBe(0);
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
      .send({ occurredAt: '2026-06-30T10:00:00+07:00' })
      .expect(409);
    expect(bodyAs<ErrorBody>(backdateResponse).code).toBe(
      'BACKDATE_NOT_ALLOWED',
    );
    await expect(prisma.auditLog.count()).resolves.toBe(beforeAuditCount);
  });

  it('rejects invalid and unknown fields with stable validation envelope', async () => {
    const response = await mutation(`/api/houses/${HOUSE_CODE}/violations`)
      .send({ occurredAt: 'invalid', amountBaht: 1 })
      .expect(400);
    const body = bodyAs<ErrorBody>(response);

    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('serializes parallel creates without duplicate cycle or sequence', async () => {
    const responses = await Promise.all(
      occurredAt.slice(0, 4).map((timestamp) =>
        mutation(`/api/houses/${HOUSE_CODE}/violations`).send({
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
