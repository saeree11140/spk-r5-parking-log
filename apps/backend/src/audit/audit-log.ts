import type { Prisma } from '../generated/prisma/client';
import type { AuditAction } from '../generated/prisma/enums';

export async function writeAudit(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
  action: AuditAction,
  before: Prisma.InputJsonValue | null,
  after: Prisma.InputJsonValue | null,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      before: before ?? undefined,
      after: after ?? undefined,
      actorType: 'SYSTEM',
      actorLabel: 'core-api',
    },
  });
}
