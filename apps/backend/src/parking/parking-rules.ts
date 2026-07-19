import type { ViolationStatus } from '../generated/prisma/enums';

export interface SequencePlanItem {
  id: string;
  sequenceNumber: number;
  status: ViolationStatus;
  fineAmountBaht: 0 | 500 | 1000;
}

export function fineAmountForSequence(sequenceNumber: number): 0 | 500 | 1000 {
  if (sequenceNumber < 3) return 0;
  return sequenceNumber === 3 ? 1000 : 500;
}

export function buildSequencePlan(ids: readonly string[]): SequencePlanItem[] {
  return ids.map((id, index) => {
    const sequenceNumber = index + 1;
    const fineAmountBaht = fineAmountForSequence(sequenceNumber);

    return {
      id,
      sequenceNumber,
      status: fineAmountBaht === 0 ? 'WARNING' : 'PENDING_FINE',
      fineAmountBaht,
    };
  });
}
