import { Injectable } from '@nestjs/common';
import type {
  FineResponse,
  ViolationResponse,
} from '@spk-r5-parking-log/shared-types';

import { type AuditActor, writeAudit } from '../audit/audit-log';
import { parsePastDateTime } from '../common/date-time';
import { DomainError } from '../common/domain-error';
import { runSerializable } from '../common/serializable-transaction';
import { PrismaService } from '../database/prisma.service';
import { mapFine, mapViolation } from '../houses/houses.types';
import type { MarkFinePaidDto } from './mark-fine-paid.dto';

export interface MarkFinePaidResponse {
  fine: FineResponse;
  violation: ViolationResponse;
  cycleClosed: boolean;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async markPaid(
    houseCode: string,
    violationId: string,
    dto: MarkFinePaidDto,
    actor: AuditActor,
  ): Promise<MarkFinePaidResponse> {
    const paidAt = parsePastDateTime(dto.paidAt, new Date());

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
      if (!violation.fine) {
        throw new DomainError(404, 'FINE_NOT_FOUND', 'Fine not found');
      }
      if (violation.fine.status === 'PAID') {
        throw new DomainError(409, 'FINE_ALREADY_PAID', 'Fine is already paid');
      }
      if (violation.fine.status !== 'PENDING') {
        throw new DomainError(409, 'FINE_NOT_PENDING', 'Fine is not pending');
      }
      if (paidAt.getTime() < violation.occurredAt.getTime()) {
        throw new DomainError(
          400,
          'INVALID_PAYMENT_TIMESTAMP',
          'Payment cannot be before violation',
        );
      }

      const paidFine = await tx.fine.update({
        where: { id: violation.fine.id },
        data: {
          status: 'PAID',
          paidAt,
          reference: dto.reference ?? null,
        },
      });
      const paidViolation = await tx.parkingViolation.update({
        where: { id: violation.id },
        data: { status: 'PAID' },
      });
      await writeAudit(
        tx,
        'Fine',
        paidFine.id,
        'PAY',
        { status: violation.fine.status, paidAt: null },
        {
          status: 'PAID',
          paidAt: paidAt.toISOString(),
          reference: dto.reference ?? null,
        },
        actor,
      );
      await writeAudit(
        tx,
        'ParkingViolation',
        violation.id,
        'PAY',
        { status: violation.status },
        { status: 'PAID' },
        actor,
      );

      const pendingFineCount = await tx.fine.count({
        where: { status: 'PENDING', violation: { cycleId: violation.cycleId } },
      });
      let cycleClosed = false;
      if (pendingFineCount === 0) {
        const latestPayment = await tx.fine.aggregate({
          where: { status: 'PAID', violation: { cycleId: violation.cycleId } },
          _max: { paidAt: true },
        });
        const closedAt = latestPayment._max.paidAt ?? paidAt;
        await tx.violationCycle.update({
          where: { id: violation.cycleId },
          data: { status: 'CLOSED', closedAt },
        });
        await writeAudit(
          tx,
          'ViolationCycle',
          violation.cycleId,
          'CLOSE',
          { status: 'OPEN', closedAt: null },
          { status: 'CLOSED', closedAt: closedAt.toISOString() },
          actor,
        );
        cycleClosed = true;
      }

      const fineResponse = mapFine(paidFine);
      if (!fineResponse) {
        throw new Error('Paid fine response missing');
      }
      return {
        fine: fineResponse,
        violation: mapViolation({ ...paidViolation, fine: paidFine }),
        cycleClosed,
      };
    });
  }
}
