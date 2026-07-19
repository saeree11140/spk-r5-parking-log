import { Matches } from 'class-validator';

export class HouseCodeDto {
  @Matches(/^R5-(00[1-9]|0[1-9][0-9]|1[0-5][0-9]|16[0-4])$/)
  houseCode!: string;
}
