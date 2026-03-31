import { Module } from '@nestjs/common';
import { HousesModule } from './houses/houses.module';
import { IncidentsModule } from './incidents/incidents.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HousesModule, IncidentsModule],
})
export class AppModule {}
