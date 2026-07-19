import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { HousesModule } from './houses/houses.module';

@Module({
  imports: [DatabaseModule, HealthModule, HousesModule],
})
export class AppModule {}
