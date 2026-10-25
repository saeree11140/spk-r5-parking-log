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
      // Commit SHA baked into the image by CI; the deploy job waits for it.
      version: process.env.APP_VERSION?.trim() || 'dev',
    };
  }
}
