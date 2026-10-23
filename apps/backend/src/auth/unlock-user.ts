import type { PrismaClient } from '../generated/prisma/client';
import { runSerializable } from '../common/serializable-transaction';

/**
 * Clears every login lock of a user (per-IP and account-wide). Used by the
 * operator CLI when the only admin is locked out. Returns false when the
 * username does not exist.
 */
export async function unlockUser(
  prisma: PrismaClient,
  username: string,
): Promise<boolean> {
  const normalizedUsername = username.trim().toLowerCase();

  return runSerializable(prisma, async (tx) => {
    const user = await tx.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });
    if (!user) return false;

    await tx.loginFailure.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        failedWindowStartedAt: null,
        lockedUntil: null,
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: 'User',
        entityId: user.id,
        action: 'UNLOCK',
        after: { source: 'CLI' },
        actorType: 'SYSTEM',
        actorLabel: 'auth:unlock',
      },
    });
    return true;
  });
}
