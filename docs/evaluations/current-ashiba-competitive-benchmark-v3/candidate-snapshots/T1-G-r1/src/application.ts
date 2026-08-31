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

class ApplicationFailure extends Error implements ApplicationError {
  constructor(
    public readonly code: ApplicationError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationFailure';
  }
}

const MAX_BIGINT = 9_223_372_036_854_775_807n;

function validationFailure(message: string): ApplicationFailure {
  return new ApplicationFailure('VALIDATION', message);
}

function positiveBigintString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    throw validationFailure(`${field} must be a positive base-10 integer string`);
  }

  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > MAX_BIGINT) {
    throw validationFailure(`${field} is outside PostgreSQL bigint range`);
  }

  return value;
}

function transferInput(value: unknown): {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
} {
  if (value === null || typeof value !== 'object') {
    throw validationFailure('transfer input must be an object');
  }

  const input = value as Record<string, unknown>;
  if (typeof input.note !== 'string') {
    throw validationFailure('note must be a string');
  }

  return {
    fromAccountId: positiveBigintString(input.fromAccountId, 'fromAccountId'),
    toAccountId: positiveBigintString(input.toAccountId, 'toAccountId'),
    amountCents: positiveBigintString(input.amountCents, 'amountCents'),
    note: input.note,
  };
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed || closePromise !== undefined) {
      throw new ApplicationFailure('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async transfer(value) {
      ensureOpen();
      const input = transferInput(value);
      const client = await pool.connect();
      let inTransaction = false;

      try {
        await client.query('BEGIN');
        inTransaction = true;

        // Lock in a stable order so reversed concurrent transfers cannot deadlock.
        const lockedAccounts = await client.query<{ account_id: string }>(
          `SELECT account_id
           FROM accounts
           WHERE account_id = ANY($1::bigint[])
           ORDER BY account_id
           FOR UPDATE`,
          [[input.fromAccountId, input.toAccountId]],
        );
        const expectedAccounts = input.fromAccountId === input.toAccountId ? 1 : 2;
        if (lockedAccounts.rowCount !== expectedAccounts) {
          throw validationFailure('account does not exist');
        }

        const debit = await client.query<{ account_id: string }>(
          `UPDATE accounts
           SET balance_cents = balance_cents - $1::bigint
           WHERE account_id = $2::bigint
             AND balance_cents >= $1::bigint
           RETURNING account_id`,
          [input.amountCents, input.fromAccountId],
        );
        if (debit.rowCount !== 1) {
          throw new ApplicationFailure('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        await client.query(
          `UPDATE accounts
           SET balance_cents = balance_cents + $1::bigint
           WHERE account_id = $2::bigint`,
          [input.amountCents, input.toAccountId],
        );
        await client.query(
          `INSERT INTO transfer_audit (
             from_account_id,
             to_account_id,
             amount_cents,
             note
           ) VALUES ($1::bigint, $2::bigint, $3::bigint, $4)`,
          [
            input.fromAccountId,
            input.toAccountId,
            input.amountCents,
            input.note,
          ],
        );

        await client.query('COMMIT');
        inTransaction = false;
        return { status: 'ok', applied: true };
      } catch (error) {
        if (inTransaction) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Preserve the error that caused the transaction to fail.
          }
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      if (closePromise === undefined) {
        closePromise = pool.end().then(() => {
          closed = true;
        });
      }
      await closePromise;
    },
  };
}
