import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HousesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.house.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        ownerName: true,
        address: true,
      },
    });
  }
}
