import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type {
  HouseDetail,
  HouseSummary,
} from '@spk-r5-parking-log/shared-types';

import { HouseCodeDto } from './house-code.dto';
import { HousesService } from './houses.service';

@SkipThrottle({ auth: true })
@Controller('houses')
export class HousesController {
  constructor(private readonly houses: HousesService) {}

  @Get()
  list(): Promise<HouseSummary[]> {
    return this.houses.list();
  }

  @Get(':houseCode')
  get(@Param() params: HouseCodeDto): Promise<HouseDetail> {
    return this.houses.getByCode(params.houseCode);
  }
}
