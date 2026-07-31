import type { HealthCheckResponse } from '@spk-r5-parking-log/shared-types';
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../auth/decorators/public.decorator';

@Public()
@SkipThrottle({ auth: true })
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
