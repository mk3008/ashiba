import { and, eq, gte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { bigint, pgTable, text } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  transfer(input: {
    fromAccountId: string;
    toAccountId: string;
    amountCents: string;
    note: string;
  }): Promise<{ status: 'ok'; applied: true }>;
  close(): Promise<void>;
}

const accounts = pgTable('accounts', {
  accountId: bigint('account_id', { mode: 'bigint' }).primaryKey(),
  balanceCents: bigint('balance_cents', { mode: 'bigint' }).notNull(),
});

const transferAudit = pgTable('transfer_audit', {
  fromAccountId: bigint('from_account_id', { mode: 'bigint' }).notNull(),
  toAccountId: bigint('to_account_id', { mode: 'bigint' }).notNull(),
  amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
  note: text('note').notNull(),
});

const POSITIVE_INTEGER = /^0*[1-9][0-9]*$/;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

function applicationError(
  code: ApplicationError['code'],
  message: string,
): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function positiveBigInt(value: unknown, name: string): bigint {
  if (typeof value !== 'string' || !POSITIVE_INTEGER.test(value)) {
    throw applicationError('VALIDATION', `${name} must be a positive base-10 integer string`);
  }

  const parsed = BigInt(value);
  if (parsed > MAX_POSTGRES_BIGINT) {
    throw applicationError('VALIDATION', `${name} exceeds PostgreSQL bigint range`);
  }
  return parsed;
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const database = drizzle({ client: pool });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function requireOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async transfer(input) {
      requireOpen();

      const fromAccountId = positiveBigInt(input?.fromAccountId, 'fromAccountId');
      const toAccountId = positiveBigInt(input?.toAccountId, 'toAccountId');
      const amountCents = positiveBigInt(input?.amountCents, 'amountCents');
      if (typeof input?.note !== 'string') {
        throw applicationError('VALIDATION', 'note must be a string');
      }

      await database.transaction(async (transaction) => {
        const debited = await transaction
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} - ${amountCents}` })
          .where(
            and(
              eq(accounts.accountId, fromAccountId),
              gte(accounts.balanceCents, amountCents),
            ),
          )
          .returning({ accountId: accounts.accountId });

        if (debited.length !== 1) {
          throw applicationError('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        const credited = await transaction
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} + ${amountCents}` })
          .where(eq(accounts.accountId, toAccountId))
          .returning({ accountId: accounts.accountId });

        if (credited.length !== 1) {
          throw applicationError('NOT_FOUND', 'destination account was not found');
        }

        await transaction.insert(transferAudit).values({
          fromAccountId,
          toAccountId,
          amountCents,
          note: input.note,
        });
      });

      return { status: 'ok', applied: true };
    },

    async close() {
      if (!closePromise) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
