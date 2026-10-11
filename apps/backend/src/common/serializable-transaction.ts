import { Prisma, type PrismaClient } from '../generated/prisma/client';

// Postgres SQLSTATEs that mean "retry the whole transaction".
const RETRYABLE_SQLSTATES = new Set(['40001', '40P01']);

/**
 * Serialization failures surface either as Prisma's P2034 or, with the pg
 * driver adapter (commonly at commit time), as a DriverAdapterError whose
 * cause carries the original SQLSTATE.
 */
export function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === 'P2034') return true;
  if (!('cause' in error)) return false;

  const cause = error.cause;
  if (typeof cause !== 'object' || cause === null) return false;
  return (
    ('kind' in cause && cause.kind === 'TransactionWriteConflict') ||
    ('originalCode' in cause &&
      typeof cause.originalCode === 'string' &&
      RETRYABLE_SQLSTATES.has(cause.originalCode))
  );
}

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 10;

// Randomized exponential backoff so competing transactions stop colliding.
function backoff(attempt: number): Promise<void> {
  const ceiling = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  const delay = ceiling / 2 + Math.random() * (ceiling / 2);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function runSerializable<T>(
  prisma: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      if (!isSerializationConflict(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await backoff(attempt);
    }
  }

  throw new Error('Unreachable transaction retry state');
}
