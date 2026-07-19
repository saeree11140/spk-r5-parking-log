import { Body, Controller, Param, Post } from '@nestjs/common';

import { ViolationRouteDto } from '../violations/violation-route.dto';
import { MarkFinePaidDto } from './mark-fine-paid.dto';
import { PaymentsService, type MarkFinePaidResponse } from './payments.service';

@Controller('houses')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':houseCode/violations/:violationId/mark-paid')
  markPaid(
    @Param() params: ViolationRouteDto,
    @Body() dto: MarkFinePaidDto,
  ): Promise<MarkFinePaidResponse> {
    return this.payments.markPaid(params.houseCode, params.violationId, dto);
  }
}
