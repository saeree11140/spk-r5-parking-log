import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { toAuditActor } from '../audit/audit-log';
import { HouseCodeDto } from '../houses/house-code.dto';
import { CancelViolationDto } from './cancel-violation.dto';
import { CreateViolationDto } from './create-violation.dto';
import {
  ViolationsService,
  type ViolationMutationResponse,
} from './violations.service';
import { ViolationRouteDto } from './violation-route.dto';

@Roles('ADMIN', 'STAFF')
@Controller('houses')
export class ViolationsController {
  constructor(private readonly violations: ViolationsService) {}

  @Post(':houseCode/violations')
  create(
    @Param() params: HouseCodeDto,
    @Body() dto: CreateViolationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ViolationMutationResponse> {
    return this.violations.create(params.houseCode, dto, toAuditActor(user));
  }

  @Post(':houseCode/violations/:violationId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param() params: ViolationRouteDto,
    @Body() dto: CancelViolationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ViolationMutationResponse> {
    return this.violations.cancel(
      params.houseCode,
      params.violationId,
      dto,
      toAuditActor(user),
    );
  }
}
