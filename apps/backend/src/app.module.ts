import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { HousesModule } from './houses/houses.module';
import { ViolationsModule } from './violations/violations.module';

@Module({
  imports: [DatabaseModule, HealthModule, HousesModule, ViolationsModule],
})
export class AppModule {}
