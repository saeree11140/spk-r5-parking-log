import type { Prisma } from '../generated/prisma/client';
import type { AuditAction } from '../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/auth.types';

export interface AuditActor {
  actorType: 'SYSTEM' | 'USER';
  actorId: string | null;
  actorLabel: string;
}

export const SYSTEM_ACTOR: AuditActor = {
  actorType: 'SYSTEM',
  actorId: null,
  actorLabel: 'core-api',
};

export function toAuditActor(user: AuthenticatedUser): AuditActor {
  return {
    actorType: 'USER',
    actorId: user.id,
    actorLabel: user.displayName,
  };
}

export async function writeAudit(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
  action: AuditAction,
  before: Prisma.InputJsonValue | null,
  after: Prisma.InputJsonValue | null,
  actor: AuditActor,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      before: before ?? undefined,
      after: after ?? undefined,
      actorType: actor.actorType,
      actorId: actor.actorId,
      actorLabel: actor.actorLabel,
    },
  });
}
