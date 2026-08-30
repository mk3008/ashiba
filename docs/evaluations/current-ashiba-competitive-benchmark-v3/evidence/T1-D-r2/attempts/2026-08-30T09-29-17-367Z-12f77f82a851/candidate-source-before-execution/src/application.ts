import { and, eq, gte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { createSchema } from './schema.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  transfer(input: TransferInput): Promise<{ status: 'ok'; applied: true }>;
  close(): Promise<void>;
}

const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function parsePositiveBigint(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw applicationError('VALIDATION', `${field} must be a positive base-10 integer string`);
  }
  const parsed = BigInt(value);
  if (parsed > MAX_POSTGRES_BIGINT) {
    throw applicationError('VALIDATION', `${field} is outside the PostgreSQL bigint range`);
  }
  return parsed;
}

function validateTransfer(input: TransferInput): {
  fromAccountId: bigint;
  toAccountId: bigint;
  amountCents: bigint;
  note: string;
} {
  if (input === null || typeof input !== 'object') {
    throw applicationError('VALIDATION', 'transfer input must be an object');
  }
  if (typeof input.note !== 'string') {
    throw applicationError('VALIDATION', 'note must be a string');
  }
  return {
    fromAccountId: parsePositiveBigint(input.fromAccountId, 'fromAccountId'),
    toAccountId: parsePositiveBigint(input.toAccountId, 'toAccountId'),
    amountCents: parsePositiveBigint(input.amountCents, 'amountCents'),
    note: input.note,
  };
}

/** Drizzle owns the query and transaction path; Pool is only its driver. */
export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString, max: 1 });
  const schema = createSchema(runtime.schema);
  const db = drizzle({ client: pool, schema });
  let closed = false;

  function assertOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async transfer(input: TransferInput): Promise<{ status: 'ok'; applied: true }> {
      assertOpen();
      const values = validateTransfer(input);

      await db.transaction(async (tx) => {
        const debited = await tx
          .update(schema.accounts)
          .set({ balanceCents: sql`${schema.accounts.balanceCents} - ${values.amountCents}` })
          .where(
            and(
              eq(schema.accounts.accountId, values.fromAccountId),
              gte(schema.accounts.balanceCents, values.amountCents),
            ),
          )
          .returning({ accountId: schema.accounts.accountId });

        if (debited.length !== 1) {
          throw applicationError('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        await tx
          .update(schema.accounts)
          .set({ balanceCents: sql`${schema.accounts.balanceCents} + ${values.amountCents}` })
          .where(eq(schema.accounts.accountId, values.toAccountId));

        await tx.insert(schema.transferAudit).values({
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          amountCents: values.amountCents,
          note: values.note,
        });
      });

      return { status: 'ok', applied: true };
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
