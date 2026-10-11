import { Injectable } from '@nestjs/common';
import type { ViolationCategorySummary } from '@spk-r5-parking-log/shared-types';

import { PrismaService } from '../database/prisma.service';
import { mapCategory } from './violation-categories.types';

@Injectable()
export class ViolationCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ViolationCategorySummary[]> {
    const categories = await this.prisma.violationCategory.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return categories.map(mapCategory);
  }
}
