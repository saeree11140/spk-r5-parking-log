import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { HouseCodeDto } from '../houses/house-code.dto';
import { CancelViolationDto } from './cancel-violation.dto';
import { CreateViolationDto } from './create-violation.dto';
import {
  ViolationsService,
  type ViolationMutationResponse,
} from './violations.service';
import { ViolationRouteDto } from './violation-route.dto';

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

  @Post(':houseCode/violations/:violationId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param() params: ViolationRouteDto,
    @Body() dto: CancelViolationDto,
  ): Promise<ViolationMutationResponse> {
    return this.violations.cancel(params.houseCode, params.violationId, dto);
  }
}
