import { Module } from '@nestjs/common';

import { ViolationCategoriesController } from './violation-categories.controller';
import { ViolationCategoriesService } from './violation-categories.service';

@Module({
  controllers: [ViolationCategoriesController],
  providers: [ViolationCategoriesService],
})
export class ViolationCategoriesModule {}
