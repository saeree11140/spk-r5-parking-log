import type {
  FineRuleVersion,
  ViolationStatus,
} from '../generated/prisma/enums';

export interface SequencePlanItem {
  id: string;
  sequenceNumber: number;
  status: ViolationStatus;
  fineAmountBaht: 0 | 500 | 1000;
}

export const CURRENT_FINE_RULE_VERSION: FineRuleVersion = 'V2';

// V1: two warnings, then 1000, then 500 each. V2: one warning, then 1000, then 500 each.
const WARNING_COUNT: Record<FineRuleVersion, number> = { V1: 2, V2: 1 };

export function fineAmountForSequence(
  version: FineRuleVersion,
  sequenceNumber: number,
): 0 | 500 | 1000 {
  const warningCount = WARNING_COUNT[version];
  if (sequenceNumber <= warningCount) return 0;
  return sequenceNumber === warningCount + 1 ? 1000 : 500;
}

export function buildSequencePlan(
  version: FineRuleVersion,
  ids: readonly string[],
): SequencePlanItem[] {
  return ids.map((id, index) => {
    const sequenceNumber = index + 1;
    const fineAmountBaht = fineAmountForSequence(version, sequenceNumber);

    return {
      id,
      sequenceNumber,
      status: fineAmountBaht === 0 ? 'WARNING' : 'PENDING_FINE',
      fineAmountBaht,
    };
  });
}
