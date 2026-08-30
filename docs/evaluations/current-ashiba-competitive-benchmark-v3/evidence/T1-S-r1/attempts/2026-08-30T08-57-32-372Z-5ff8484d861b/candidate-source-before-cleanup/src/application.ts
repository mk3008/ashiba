import { Pool, type PoolClient } from 'pg';
import {
  createTransferAudit,
  creditAccount,
  debitAccount,
  getAccountsForUpdate,
} from './generated/transfer.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
}

export interface Application {
  transfer(input: TransferInput): Promise<{ status: 'ok'; applied: true }>;
  close(): Promise<void>;
}

const MAX_BIGINT = 9_223_372_036_854_775_807n;

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function isPositiveBigintString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return false;
  }

  const parsed = BigInt(value);
  return parsed > 0n && parsed <= MAX_BIGINT;
}

function validateTransferInput(input: TransferInput): void {
  if (
    input === null ||
    typeof input !== 'object' ||
    !isPositiveBigintString(input.fromAccountId) ||
    !isPositiveBigintString(input.toAccountId) ||
    !isPositiveBigintString(input.amountCents) ||
    typeof input.note !== 'string'
  ) {
    throw applicationError('VALIDATION', 'transfer input is invalid');
  }
}

function canonicalPositiveBigintString(value: string): string {
  return BigInt(value).toString();
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The original database error is more useful to the caller.
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closing: Promise<void> | undefined;

  const ensureOpen = (): void => {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  };

  return {
    async transfer(input: TransferInput): Promise<{ status: 'ok'; applied: true }> {
      ensureOpen();
      validateTransferInput(input);
      const args: TransferInput = {
        ...input,
        fromAccountId: canonicalPositiveBigintString(input.fromAccountId),
        toAccountId: canonicalPositiveBigintString(input.toAccountId),
        amountCents: canonicalPositiveBigintString(input.amountCents),
      };

      const client = await pool.connect();
      let transactionStarted = false;
      try {
        await client.query('BEGIN');
        transactionStarted = true;

        // Lock in a stable order. This prevents reciprocal transfers from deadlocking.
        const lockedAccounts = await getAccountsForUpdate(client, {
          accountIds: [args.fromAccountId, args.toAccountId],
        });
        const source = lockedAccounts.find((row) => row.accountId === args.fromAccountId);
        const destination = lockedAccounts.find((row) => row.accountId === args.toAccountId);

        if (source === undefined || destination === undefined) {
          throw applicationError('INSUFFICIENT_FUNDS', 'source account cannot fund this transfer');
        }

        if (BigInt(source.balanceCents) < BigInt(args.amountCents)) {
          throw applicationError('INSUFFICIENT_FUNDS', 'source account has insufficient funds');
        }

        await debitAccount(client, {
          accountId: args.fromAccountId,
          amountCents: args.amountCents,
        });
        await creditAccount(client, {
          accountId: args.toAccountId,
          amountCents: args.amountCents,
        });
        await createTransferAudit(client, args);
        await client.query('COMMIT');
        transactionStarted = false;
        return { status: 'ok', applied: true };
      } catch (error) {
        if (transactionStarted) {
          await rollbackQuietly(client);
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async close(): Promise<void> {
      if (closing !== undefined) {
        return closing;
      }
      closed = true;
      closing = pool.end();
      await closing;
    },
  };
}
