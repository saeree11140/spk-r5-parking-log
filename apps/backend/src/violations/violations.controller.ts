import { Body, Controller, Param, Post } from '@nestjs/common';

import { HouseCodeDto } from '../houses/house-code.dto';
import { CreateViolationDto } from './create-violation.dto';
import {
  ViolationsService,
  type ViolationMutationResponse,
} from './violations.service';

@Controller('houses')
export class ViolationsController {
  constructor(private readonly violations: ViolationsService) {}

  @Post(':houseCode/violations')
  create(
    @Param() params: HouseCodeDto,
    @Body() dto: CreateViolationDto,
  ): Promise<ViolationMutationResponse> {
    return this.violations.create(params.houseCode, dto);
  }
}
