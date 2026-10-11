import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { ViolationCategorySummary } from '@spk-r5-parking-log/shared-types';

import { Roles } from '../auth/decorators/roles.decorator';
import { ViolationCategoriesService } from './violation-categories.service';

@Roles('ADMIN', 'STAFF')
@SkipThrottle({ auth: true })
@Controller('violation-categories')
export class ViolationCategoriesController {
  constructor(private readonly categories: ViolationCategoriesService) {}

  @Get()
  list(): Promise<ViolationCategorySummary[]> {
    return this.categories.list();
  }
}
