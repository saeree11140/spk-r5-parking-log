// Same rule as the backend HouseCodeDto: R5-001 through R5-164.
const HOUSE_CODE = /^R5-(00[1-9]|0[1-9][0-9]|1[0-5][0-9]|16[0-4])$/;

export function isHouseCode(value: string): boolean {
  return HOUSE_CODE.test(value);
}
