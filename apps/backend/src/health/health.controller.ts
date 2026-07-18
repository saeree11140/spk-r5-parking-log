import type { HealthCheckResponse } from '@spk-r5-parking-log/shared-types';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'spk-r5-parking-log-api',
    };
  }
}
