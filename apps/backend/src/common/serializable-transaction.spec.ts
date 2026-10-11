import type { PrismaClient } from '../generated/prisma/client';
import { runSerializable } from './serializable-transaction';

describe('runSerializable', () => {
  function prismaClient(): PrismaClient {
    return {
      $transaction: jest.fn(async (callback: unknown) =>
        (callback as (tx: unknown) => Promise<unknown>)({}),
      ),
    } as unknown as PrismaClient;
  }

  it('retries P2034 and succeeds on attempt three', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockResolvedValue('ok');

    await expect(runSerializable(prismaClient(), operation)).resolves.toBe(
      'ok',
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it.each([
    [
      'a commit-time write conflict from the pg adapter',
      {
        name: 'DriverAdapterError',
        cause: {
          originalCode: '40001',
          originalMessage:
            'could not serialize access due to read/write dependencies among transactions',
          kind: 'TransactionWriteConflict',
        },
      },
    ],
    [
      'a deadlock from the pg adapter',
      { name: 'DriverAdapterError', cause: { originalCode: '40P01' } },
    ],
  ])('retries %s', async (_, conflict) => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue('ok');

    await expect(runSerializable(prismaClient(), operation)).resolves.toBe(
      'ok',
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry another error', async () => {
    const error = new Error('no retry');
    const operation = jest.fn().mockRejectedValue(error);

    await expect(runSerializable(prismaClient(), operation)).rejects.toBe(
      error,
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('rethrows P2034 after the last attempt', async () => {
    const error = { code: 'P2034' };
    const operation = jest.fn().mockRejectedValue(error);

    await expect(runSerializable(prismaClient(), operation)).rejects.toBe(
      error,
    );
    expect(operation).toHaveBeenCalledTimes(5);
  });
});
