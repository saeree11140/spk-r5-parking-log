import { Injectable } from '@nestjs/common';
import type {
  CycleSummary,
  ViolationResponse,
} from '@spk-r5-parking-log/shared-types';

import { type AuditActor, writeAudit } from '../audit/audit-log';
import { parsePastDateTime } from '../common/date-time';
import { DomainError } from '../common/domain-error';
import { runSerializable } from '../common/serializable-transaction';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { mapViolation, summarizeCycle } from '../houses/houses.types';
import type { CreateViolationDto } from './create-violation.dto';
import type { CancelViolationDto } from './cancel-violation.dto';
import { resequenceCycle } from './violation-resequence';
import type { UpdateViolationDto } from './update-violation.dto';

export interface ViolationMutationResponse {
  violation: ViolationResponse;
  currentCycle: CycleSummary;
}

@Injectable()
export class ViolationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    houseCode: string,
    dto: CreateViolationDto,
    actor: AuditActor,
  ): Promise<ViolationMutationResponse> {
    const occurredAt = parsePastDateTime(dto.occurredAt, new Date());

    return runSerializable(this.prisma, async (tx) => {
      const house = await tx.house.findUnique({ where: { code: houseCode } });
      if (!house) {
        throw new DomainError(404, 'HOUSE_NOT_FOUND', 'House not found');
      }
      if (!house.isActive) {
        throw new DomainError(409, 'HOUSE_INACTIVE', 'House is inactive');
      }

      const cycle = await this.findOrCreateOpenCycle(tx, house.id, occurredAt);
      await this.assertBackdateAllowed(tx, cycle.id, occurredAt);

      const sequence = await tx.parkingViolation.aggregate({
        where: { cycleId: cycle.id, status: { not: 'CANCELLED' } },
        _max: { sequenceNumber: true },
      });
      const violation = await tx.parkingViolation.create({
        data: {
          cycleId: cycle.id,
          occurredAt,
          sequenceNumber: (sequence._max.sequenceNumber ?? 0) + 1,
          status: 'WARNING',
          note: dto.note ?? null,
        },
      });

      await resequenceCycle(tx, cycle.id, actor);
      await writeAudit(
        tx,
        'ParkingViolation',
        violation.id,
        'CREATE',
        null,
        {
          cycleId: cycle.id,
          occurredAt: occurredAt.toISOString(),
          note: dto.note ?? null,
        },
        actor,
      );

      return this.loadMutationResponse(tx, violation.id, cycle.id);
    });
  }

  async cancel(
    houseCode: string,
    violationId: string,
    dto: CancelViolationDto,
    actor: AuditActor,
  ): Promise<ViolationMutationResponse> {
    return runSerializable(this.prisma, async (tx) => {
      const violation = await tx.parkingViolation.findFirst({
        where: { id: violationId, cycle: { house: { code: houseCode } } },
        include: { cycle: true, fine: true },
      });
      if (!violation) {
        throw new DomainError(
          404,
          'VIOLATION_NOT_FOUND',
          'Violation not found',
        );
      }
      if (violation.cycle.status !== 'OPEN') {
        throw new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed');
      }
      if (violation.status === 'CANCELLED') {
        throw new DomainError(
          409,
          'VIOLATION_ALREADY_CANCELLED',
          'Violation is already cancelled',
        );
      }

      const paidFineCount = await tx.fine.count({
        where: { status: 'PAID', violation: { cycleId: violation.cycleId } },
      });
      if (paidFineCount > 0) {
        throw new DomainError(
          409,
          'PAID_CYCLE_IMMUTABLE',
          'Paid cycle cannot be modified',
        );
      }

      const cancelledAt = new Date();
      const cancelled = await tx.parkingViolation.update({
        where: { id: violation.id },
        data: {
          sequenceNumber: null,
          status: 'CANCELLED',
          cancelledAt,
          cancellationReason: dto.reason,
        },
      });
      if (violation.fine && violation.fine.status !== 'CANCELLED') {
        await tx.fine.update({
          where: { id: violation.fine.id },
          data: {
            amountBaht: 0,
            status: 'CANCELLED',
            paidAt: null,
            reference: null,
          },
        });
        await writeAudit(
          tx,
          'Fine',
          violation.fine.id,
          'CANCEL',
          {
            status: violation.fine.status,
            amountBaht: violation.fine.amountBaht,
          },
          { status: 'CANCELLED', amountBaht: 0 },
          actor,
        );
      }

      await resequenceCycle(tx, violation.cycleId, actor);
      await writeAudit(
        tx,
        'ParkingViolation',
        violation.id,
        'CANCEL',
        {
          sequenceNumber: violation.sequenceNumber,
          status: violation.status,
        },
        {
          sequenceNumber: null,
          status: cancelled.status,
          cancelledAt: cancelledAt.toISOString(),
          cancellationReason: dto.reason,
        },
        actor,
      );

      return this.loadMutationResponse(tx, violation.id, violation.cycleId);
    });
  }

  async update(
    houseCode: string,
    violationId: string,
    dto: UpdateViolationDto,
    actor: AuditActor,
  ): Promise<ViolationMutationResponse> {
    const occurredAt = parsePastDateTime(dto.occurredAt, new Date());

    return runSerializable(this.prisma, async (tx) => {
      const violation = await tx.parkingViolation.findFirst({
        where: { id: violationId, cycle: { house: { code: houseCode } } },
        include: { cycle: true, fine: true },
      });
      if (!violation) {
        throw new DomainError(
          404,
          'VIOLATION_NOT_FOUND',
          'Violation not found',
        );
      }
      if (violation.cycle.status !== 'OPEN') {
        throw new DomainError(409, 'CYCLE_CLOSED', 'Cycle is closed');
      }
      if (violation.status === 'CANCELLED') {
        throw new DomainError(
          409,
          'VIOLATION_ALREADY_CANCELLED',
          'Violation is already cancelled',
        );
      }

      const paidFineCount = await tx.fine.count({
        where: { status: 'PAID', violation: { cycleId: violation.cycleId } },
      });
      if (paidFineCount > 0) {
        throw new DomainError(
          409,
          'PAID_CYCLE_IMMUTABLE',
          'Paid cycle cannot be modified',
        );
      }

      const updated = await tx.parkingViolation.update({
        where: { id: violation.id },
        data: {
          occurredAt,
          ...(dto.note !== undefined ? { note: dto.note ?? null } : {}),
        },
      });

      await resequenceCycle(tx, violation.cycleId, actor);
      await writeAudit(
        tx,
        'ParkingViolation',
        violation.id,
        'UPDATE',
        {
          occurredAt: violation.occurredAt.toISOString(),
          note: violation.note,
        },
        {
          occurredAt: updated.occurredAt.toISOString(),
          note: updated.note,
        },
        actor,
      );

      return this.loadMutationResponse(tx, violation.id, violation.cycleId);
    });
  }

  private async findOrCreateOpenCycle(
    tx: Prisma.TransactionClient,
    houseId: string,
    occurredAt: Date,
  ) {
    const openCycle = await tx.violationCycle.findFirst({
      where: { houseId, status: 'OPEN' },
    });
    if (openCycle) return openCycle;

    const latestCycle = await tx.violationCycle.findFirst({
      where: { houseId },
      orderBy: { cycleNumber: 'desc' },
    });
    if (
      latestCycle?.closedAt &&
      occurredAt.getTime() <= latestCycle.closedAt.getTime()
    ) {
      throw new DomainError(
        409,
        'BACKDATE_NOT_ALLOWED',
        'Violation cannot be backdated before closed cycle',
      );
    }

    return tx.violationCycle.create({
      data: {
        houseId,
        cycleNumber: (latestCycle?.cycleNumber ?? 0) + 1,
        status: 'OPEN',
        openedAt: occurredAt,
      },
    });
  }

  private async assertBackdateAllowed(
    tx: Prisma.TransactionClient,
    cycleId: string,
    occurredAt: Date,
  ): Promise<void> {
    const paidFineCount = await tx.fine.count({
      where: { status: 'PAID', violation: { cycleId } },
    });
    if (paidFineCount === 0) return;

    const latestViolation = await tx.parkingViolation.findFirst({
      where: { cycleId, status: { not: 'CANCELLED' } },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    if (
      latestViolation &&
      occurredAt.getTime() < latestViolation.occurredAt.getTime()
    ) {
      throw new DomainError(
        409,
        'BACKDATE_NOT_ALLOWED',
        'Paid cycle cannot accept backdated violations',
      );
    }
  }

  private async loadMutationResponse(
    tx: Prisma.TransactionClient,
    violationId: string,
    cycleId: string,
  ): Promise<ViolationMutationResponse> {
    const [violation, cycle] = await Promise.all([
      tx.parkingViolation.findUniqueOrThrow({
        where: { id: violationId },
        include: { fine: true },
      }),
      tx.violationCycle.findUniqueOrThrow({
        where: { id: cycleId },
        include: { violations: { include: { fine: true } } },
      }),
    ]);

    return {
      violation: mapViolation(violation),
      currentCycle: summarizeCycle(cycle),
    };
  }
}
