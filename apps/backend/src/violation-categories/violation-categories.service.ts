import { Injectable } from '@nestjs/common';
import type { ViolationCategorySummary } from '@spk-r5-parking-log/shared-types';

import { type AuditActor, writeAudit } from '../audit/audit-log';
import { DomainError } from '../common/domain-error';
import { runSerializable } from '../common/serializable-transaction';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { normalizeCategoryName } from './category-name';
import { mapCategory } from './violation-categories.types';

function auditState(category: { name: string; isActive: boolean }) {
  return { name: category.name, isActive: category.isActive };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class ViolationCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ViolationCategorySummary[]> {
    const categories = await this.prisma.violationCategory.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return categories.map(mapCategory);
  }

  async create(
    name: string,
    actor: AuditActor,
  ): Promise<ViolationCategorySummary> {
    return this.withNameGuard(async (tx) => {
      const category = await tx.violationCategory.create({
        data: { name, normalizedName: normalizeCategoryName(name) },
      });
      await writeAudit(
        tx,
        'ViolationCategory',
        category.id,
        'CREATE',
        null,
        auditState(category),
        actor,
      );

      return mapCategory(category);
    });
  }

  async rename(
    id: string,
    name: string,
    actor: AuditActor,
  ): Promise<ViolationCategorySummary> {
    return this.withNameGuard(async (tx) => {
      const before = await this.findOrThrow(tx, id);
      if (before.name === name) return mapCategory(before);

      const category = await tx.violationCategory.update({
        where: { id },
        data: { name, normalizedName: normalizeCategoryName(name) },
      });
      await writeAudit(
        tx,
        'ViolationCategory',
        id,
        'UPDATE',
        auditState(before),
        auditState(category),
        actor,
      );

      return mapCategory(category);
    });
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuditActor,
  ): Promise<ViolationCategorySummary> {
    return runSerializable(this.prisma, async (tx) => {
      const before = await this.findOrThrow(tx, id);
      if (before.isActive === isActive) return mapCategory(before);

      const category = await tx.violationCategory.update({
        where: { id },
        data: { isActive },
      });
      await writeAudit(
        tx,
        'ViolationCategory',
        id,
        isActive ? 'ACTIVATE' : 'DEACTIVATE',
        auditState(before),
        auditState(category),
        actor,
      );

      return mapCategory(category);
    });
  }

  private async withNameGuard<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await runSerializable(this.prisma, operation);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) throw this.nameTaken();
      throw error;
    }
  }

  private async findOrThrow(tx: Prisma.TransactionClient, id: string) {
    const category = await tx.violationCategory.findUnique({ where: { id } });
    if (!category) {
      throw new DomainError(
        404,
        'CATEGORY_NOT_FOUND',
        'Violation category not found',
      );
    }
    return category;
  }

  private nameTaken(): DomainError {
    return new DomainError(
      409,
      'CATEGORY_NAME_TAKEN',
      'Violation category name is already in use',
    );
  }
}
