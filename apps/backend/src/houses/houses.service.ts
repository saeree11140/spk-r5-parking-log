import { Injectable } from '@nestjs/common';
import type {
  HouseDetail,
  HouseSummary,
} from '@spk-r5-parking-log/shared-types';

import { DomainError } from '../common/domain-error';
import { PrismaService } from '../database/prisma.service';
import {
  mapHouseDetail,
  mapHouseSummary,
  type HouseRecord,
} from './houses.types';

@Injectable()
export class HousesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<HouseSummary[]> {
    const houses = await this.prisma.house.findMany({
      orderBy: { sequenceNumber: 'asc' },
      include: {
        cycles: {
          where: { status: 'OPEN' },
          orderBy: { cycleNumber: 'desc' },
          take: 1,
          include: { violations: { include: { fine: true } } },
        },
      },
    });

    return houses.map((house) => mapHouseSummary(house as HouseRecord));
  }

  async getByCode(code: string): Promise<HouseDetail> {
    const house = await this.prisma.house.findUnique({
      where: { code },
      include: {
        cycles: {
          orderBy: { cycleNumber: 'desc' },
          include: { violations: { include: { fine: true } } },
        },
      },
    });

    if (!house) {
      throw new DomainError(404, 'HOUSE_NOT_FOUND', 'House not found');
    }

    return mapHouseDetail(house);
  }
}
