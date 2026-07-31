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
import { ViolationRouteDto } from '../violations/violation-route.dto';
import { MarkFinePaidDto } from './mark-fine-paid.dto';
import { PaymentsService, type MarkFinePaidResponse } from './payments.service';

@Roles('ADMIN', 'STAFF')
@Controller('houses')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':houseCode/violations/:violationId/mark-paid')
  @HttpCode(HttpStatus.OK)
  markPaid(
    @Param() params: ViolationRouteDto,
    @Body() dto: MarkFinePaidDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MarkFinePaidResponse> {
    return this.payments.markPaid(
      params.houseCode,
      params.violationId,
      dto,
      toAuditActor(user),
    );
  }
}
