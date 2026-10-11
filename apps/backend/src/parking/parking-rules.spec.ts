import { buildSequencePlan, fineAmountForSequence } from './parking-rules';

describe('parking rules', () => {
  it.each([
    [1, 0],
    [2, 0],
    [3, 1000],
    [4, 500],
    [5, 500],
  ])('V1 maps sequence %i to fine %i', (sequence, amount) => {
    expect(fineAmountForSequence('V1', sequence)).toBe(amount);
  });

  it.each([
    [1, 0],
    [2, 1000],
    [3, 500],
    [4, 500],
    [5, 500],
  ])('V2 maps sequence %i to fine %i', (sequence, amount) => {
    expect(fineAmountForSequence('V2', sequence)).toBe(amount);
  });

  it('V1 builds deterministic statuses and total 2000 through violation five', () => {
    const plan = buildSequencePlan('V1', ['a', 'b', 'c', 'd', 'e']);

    expect(plan.map(({ status }) => status)).toEqual([
      'WARNING',
      'WARNING',
      'PENDING_FINE',
      'PENDING_FINE',
      'PENDING_FINE',
    ]);
    expect(plan.reduce((sum, item) => sum + item.fineAmountBaht, 0)).toBe(2000);
  });

  it('V2 builds deterministic statuses and total 2500 through violation five', () => {
    const plan = buildSequencePlan('V2', ['a', 'b', 'c', 'd', 'e']);

    expect(plan.map(({ status }) => status)).toEqual([
      'WARNING',
      'PENDING_FINE',
      'PENDING_FINE',
      'PENDING_FINE',
      'PENDING_FINE',
    ]);
    expect(plan.reduce((sum, item) => sum + item.fineAmountBaht, 0)).toBe(2500);
  });
});
