import { Pool, type PoolClient } from 'pg';

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

const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

function applicationError(
  code: ApplicationError['code'],
  message: string,
): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

/**
 * All external SQL values remain parameters. This workload has no dynamic SQL
 * syntax, so no application input is ever interpolated into a query string.
 */
function parsePositiveBigint(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw applicationError('VALIDATION', `${field} must be a base-10 integer string`);
  }

  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > MAX_POSTGRES_BIGINT) {
    throw applicationError('VALIDATION', `${field} must be a supported positive integer`);
  }

  return parsed.toString();
}

function validateTransfer(input: unknown): {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw applicationError('VALIDATION', 'transfer input must be an object');
  }

  const transfer = input as Record<string, unknown>;
  const note = transfer.note;
  if (typeof note !== 'string') {
    throw applicationError('VALIDATION', 'note must be a string');
  }

  return {
    fromAccountId: parsePositiveBigint(transfer.fromAccountId, 'fromAccountId'),
    toAccountId: parsePositiveBigint(transfer.toAccountId, 'toAccountId'),
    amountCents: parsePositiveBigint(transfer.amountCents, 'amountCents'),
    note,
  };
}

async function rollbackIfNeeded(client: PoolClient, begun: boolean): Promise<void> {
  if (begun) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original query error is more useful to the caller.
    }
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closePromise !== undefined) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async transfer(input) {
      ensureOpen();
      const validated = validateTransfer(input);
      const client = await pool.connect();
      let begun = false;

      try {
        await client.query('BEGIN');
        begun = true;

        // Lock in account-id order so opposite-direction transfers do not deadlock.
        const locked = await client.query<{ account_id: string; balance_cents: string }>(
          `SELECT account_id::text, balance_cents::text
           FROM accounts
           WHERE account_id = ANY($1::bigint[])
           ORDER BY account_id ASC
           FOR UPDATE`,
          [[validated.fromAccountId, validated.toAccountId]],
        );

        const balances = new Map(locked.rows.map((row) => [row.account_id, BigInt(row.balance_cents)]));
        const fromBalance = balances.get(validated.fromAccountId);
        const toBalance = balances.get(validated.toAccountId);
        if (fromBalance === undefined || toBalance === undefined) {
          await client.query('ROLLBACK');
          begun = false;
          throw applicationError('NOT_FOUND', 'account was not found');
        }

        if (fromBalance < BigInt(validated.amountCents)) {
          await client.query('ROLLBACK');
          begun = false;
          throw applicationError('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        await client.query(
          `UPDATE accounts
           SET balance_cents = balance_cents - $1::bigint
           WHERE account_id = $2::bigint`,
          [validated.amountCents, validated.fromAccountId],
        );
        await client.query(
          `UPDATE accounts
           SET balance_cents = balance_cents + $1::bigint
           WHERE account_id = $2::bigint`,
          [validated.amountCents, validated.toAccountId],
        );
        await client.query(
          `INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
           VALUES ($1::bigint, $2::bigint, $3::bigint, $4::text)`,
          [
            validated.fromAccountId,
            validated.toAccountId,
            validated.amountCents,
            validated.note,
          ],
        );

        await client.query('COMMIT');
        begun = false;
        return { status: 'ok', applied: true };
      } catch (error) {
        await rollbackIfNeeded(client, begun);
        throw error;
      } finally {
        client.release();
      }
    },

    close() {
      if (closePromise === undefined) {
        closePromise = pool.end();
      }
      return closePromise;
    },
  };
}
