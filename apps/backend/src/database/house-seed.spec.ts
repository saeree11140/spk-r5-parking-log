import { buildHouseSeed } from './house-seed';

describe('buildHouseSeed', () => {
  it('creates exactly 164 houses', () => {
    expect(buildHouseSeed()).toHaveLength(164);
  });

  it('creates ordered zero-padded codes', () => {
    const houses = buildHouseSeed();

    expect(houses[0]).toEqual({
      actualHouseNumber: '1',
      code: 'R5-001',
      sequenceNumber: 1,
    });
    expect(houses[4]).toEqual({
      actualHouseNumber: '5',
      code: 'R5-005',
      sequenceNumber: 5,
    });
    expect(houses[25]).toEqual({
      actualHouseNumber: '26',
      code: 'R5-026',
      sequenceNumber: 26,
    });
    expect(houses[163]).toEqual({
      actualHouseNumber: '164',
      code: 'R5-164',
      sequenceNumber: 164,
    });
    expect(new Set(houses.map(({ code }) => code)).size).toBe(164);
  });
});
