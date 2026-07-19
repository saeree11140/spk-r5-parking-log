import { IsUUID } from 'class-validator';

import { HouseCodeDto } from '../houses/house-code.dto';

export class ViolationRouteDto extends HouseCodeDto {
  @IsUUID()
  violationId!: string;
}
