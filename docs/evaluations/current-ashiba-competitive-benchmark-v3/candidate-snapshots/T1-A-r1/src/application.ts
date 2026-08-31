import { bindNamedParameters, type ParameterBinding } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
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

class AppError extends Error implements ApplicationError {
  constructor(
    public readonly code: ApplicationError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

const positiveInteger = /^[1-9][0-9]*$/;

function requirePositiveInteger(value: string, name: string): void {
  if (!positiveInteger.test(value)) {
    throw new AppError('VALIDATION', `${name} must be a positive base-10 integer string`);
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const schema = quoteIdentifier(runtime.schema);
  let closed = false;

  // These remain canonical named-parameter statements; only the configured schema is syntax.
  const debit = compileNamedParameters(`
    UPDATE ${schema}.accounts
    SET balance_cents = balance_cents - :amountCents
    WHERE account_id = :fromAccountId
      AND balance_cents >= :amountCents
    RETURNING account_id
  `);
  const credit = compileNamedParameters(`
    UPDATE ${schema}.accounts
    SET balance_cents = balance_cents + :amountCents
    WHERE account_id = :toAccountId
    RETURNING account_id
  `);
  const audit = compileNamedParameters(`
    INSERT INTO ${schema}.transfer_audit
      (from_account_id, to_account_id, amount_cents, note)
    VALUES (:fromAccountId, :toAccountId, :amountCents, :note)
  `);

  const ensureOpen = (): void => {
    if (closed) {
      throw new AppError('APPLICATION_CLOSED', 'Application is closed');
    }
  };

  const query = async (
    client: PoolClient,
    statement: ParameterBinding,
    parameters: Readonly<Record<string, unknown>>,
  ) => {
    const bound = bindNamedParameters(statement, parameters);
    return client.query(bound.sql, Array.from(bound.values));
  };

  return {
    async transfer(input): Promise<{ status: 'ok'; applied: true }> {
      ensureOpen();
      requirePositiveInteger(input.fromAccountId, 'fromAccountId');
      requirePositiveInteger(input.toAccountId, 'toAccountId');
      requirePositiveInteger(input.amountCents, 'amountCents');
      if (typeof input.note !== 'string') {
        throw new AppError('VALIDATION', 'note must be a string');
      }

      const client = await pool.connect();
      let transactionStarted = false;
      try {
        await client.query('BEGIN');
        transactionStarted = true;

        const debitResult = await query(client, debit, {
          fromAccountId: input.fromAccountId,
          amountCents: input.amountCents,
        });
        if (debitResult.rowCount !== 1) {
          await client.query('ROLLBACK');
          transactionStarted = false;
          throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient funds');
        }

        const creditResult = await query(client, credit, {
          toAccountId: input.toAccountId,
          amountCents: input.amountCents,
        });
        if (creditResult.rowCount !== 1) {
          throw new AppError('VALIDATION', 'Destination account does not exist');
        }
        await query(client, audit, {
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amountCents: input.amountCents,
          note: input.note,
        });
        await client.query('COMMIT');
        transactionStarted = false;
        return { status: 'ok', applied: true };
      } catch (error) {
        if (transactionStarted) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Preserve the operation error; the client is still released below.
          }
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async close(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      await pool.end();
    },
  };
}
