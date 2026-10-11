import type {
  CycleResponse,
  CycleSummary,
  FineResponse,
  HouseDetail,
  HouseSummary,
  ViolationResponse,
  FineRuleVersion,
  ViolationCategorySummary,
} from '@spk-r5-parking-log/shared-types';

import { mapCategory } from '../violation-categories/violation-categories.types';

interface FineRecord {
  id: string;
  amountBaht: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paidAt: Date | null;
  reference: string | null;
}

interface ViolationRecord {
  id: string;
  sequenceNumber: number | null;
  occurredAt: Date;
  status: 'WARNING' | 'PENDING_FINE' | 'PAID' | 'CANCELLED';
  note: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  fine: FineRecord | null;
}

interface CycleRecord {
  id: string;
  cycleNumber: number;
  fineRuleVersion: FineRuleVersion;
  category: ViolationCategorySummary;
  status: 'OPEN' | 'CLOSED';
  openedAt: Date;
  closedAt: Date | null;
  violations: ViolationRecord[];
}

export interface HouseRecord {
  id: string;
  code: string;
  sequenceNumber: number;
  actualHouseNumber: string | null;
  isActive: boolean;
  cycles: CycleRecord[];
}

export function mapFine(fine: FineRecord | null): FineResponse | null {
  if (!fine) return null;
  return {
    id: fine.id,
    amountBaht: fine.amountBaht,
    status: fine.status,
    paidAt: fine.paidAt?.toISOString() ?? null,
    reference: fine.reference,
  };
}

export function mapViolation(violation: ViolationRecord): ViolationResponse {
  return {
    id: violation.id,
    sequenceNumber: violation.sequenceNumber,
    occurredAt: violation.occurredAt.toISOString(),
    status: violation.status,
    note: violation.note,
    cancelledAt: violation.cancelledAt?.toISOString() ?? null,
    cancellationReason: violation.cancellationReason,
    fine: mapFine(violation.fine),
  };
}

export function summarizeCycle(cycle: CycleRecord): CycleSummary {
  const activeViolations = cycle.violations.filter(
    ({ status }) => status !== 'CANCELLED',
  );
  const pendingFines = activeViolations
    .map(({ fine }) => fine)
    .filter((fine): fine is FineRecord => fine?.status === 'PENDING');

  return {
    id: cycle.id,
    cycleNumber: cycle.cycleNumber,
    fineRuleVersion: cycle.fineRuleVersion,
    category: mapCategory(cycle.category),
    violationCount: activeViolations.length,
    pendingFineCount: pendingFines.length,
    pendingAmountBaht: pendingFines.reduce(
      (total, fine) => total + fine.amountBaht,
      0,
    ),
  };
}

export function mapHouseSummary(house: HouseRecord): HouseSummary {
  return {
    id: house.id,
    code: house.code,
    sequenceNumber: house.sequenceNumber,
    actualHouseNumber: house.actualHouseNumber,
    isActive: house.isActive,
    currentCycles: house.cycles
      .filter(({ status }) => status === 'OPEN')
      .map(summarizeCycle),
  };
}

function mapCycle(cycle: CycleRecord): CycleResponse {
  const summary = summarizeCycle(cycle);
  const activeFines = cycle.violations
    .map(({ fine }) => fine)
    .filter(
      (fine): fine is FineRecord =>
        fine !== null && fine.status !== 'CANCELLED',
    );
  const paidFines = activeFines.filter(({ status }) => status === 'PAID');
  const violations = [...cycle.violations].sort((left, right) => {
    const leftCancelled = left.status === 'CANCELLED';
    const rightCancelled = right.status === 'CANCELLED';
    if (leftCancelled !== rightCancelled) return leftCancelled ? 1 : -1;
    if (!leftCancelled && !rightCancelled) {
      return (left.sequenceNumber ?? 0) - (right.sequenceNumber ?? 0);
    }
    return left.occurredAt.getTime() - right.occurredAt.getTime();
  });

  return {
    ...summary,
    status: cycle.status,
    openedAt: cycle.openedAt.toISOString(),
    closedAt: cycle.closedAt?.toISOString() ?? null,
    totalFineAmountBaht: activeFines.reduce(
      (total, fine) => total + fine.amountBaht,
      0,
    ),
    paidFineCount: paidFines.length,
    paidAmountBaht: paidFines.reduce(
      (total, fine) => total + fine.amountBaht,
      0,
    ),
    violations: violations.map(mapViolation),
  };
}

export function mapHouseDetail(house: HouseRecord): HouseDetail {
  return {
    id: house.id,
    code: house.code,
    sequenceNumber: house.sequenceNumber,
    actualHouseNumber: house.actualHouseNumber,
    isActive: house.isActive,
    cycles: [...house.cycles]
      .sort(
        (left, right) =>
          right.openedAt.getTime() - left.openedAt.getTime() ||
          right.cycleNumber - left.cycleNumber,
      )
      .map(mapCycle),
  };
}
