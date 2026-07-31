import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { HousesModule } from './houses/houses.module';
import { PaymentsModule } from './payments/payments.module';
import { ViolationsModule } from './violations/violations.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    HealthModule,
    HousesModule,
    ViolationsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
