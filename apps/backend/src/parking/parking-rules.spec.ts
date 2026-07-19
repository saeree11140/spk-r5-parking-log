import { buildSequencePlan, fineAmountForSequence } from './parking-rules';

describe('parking rules', () => {
  it.each([
    [1, 0],
    [2, 0],
    [3, 1000],
    [4, 500],
    [5, 500],
  ])('maps sequence %i to fine %i', (sequence, amount) => {
    expect(fineAmountForSequence(sequence)).toBe(amount);
  });

  it('builds deterministic statuses and total 2000 through violation five', () => {
    const plan = buildSequencePlan(['a', 'b', 'c', 'd', 'e']);

    expect(plan.map(({ status }) => status)).toEqual([
      'WARNING',
      'WARNING',
      'PENDING_FINE',
      'PENDING_FINE',
      'PENDING_FINE',
    ]);
    expect(plan.reduce((sum, item) => sum + item.fineAmountBaht, 0)).toBe(2000);
  });
});
