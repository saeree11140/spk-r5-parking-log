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

  it('does not retry another error', async () => {
    const error = new Error('no retry');
    const operation = jest.fn().mockRejectedValue(error);

    await expect(runSerializable(prismaClient(), operation)).rejects.toBe(
      error,
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('rethrows P2034 after attempt three', async () => {
    const error = { code: 'P2034' };
    const operation = jest.fn().mockRejectedValue(error);

    await expect(runSerializable(prismaClient(), operation)).rejects.toBe(
      error,
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
