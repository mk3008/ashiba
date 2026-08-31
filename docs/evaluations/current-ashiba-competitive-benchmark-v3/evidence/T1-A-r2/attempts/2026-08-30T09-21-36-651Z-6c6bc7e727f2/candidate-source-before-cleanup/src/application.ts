import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
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

class TransferError extends Error implements ApplicationError {
  public readonly code: ApplicationError['code'];

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

const debitStatement = compileNamedParameters(`
  UPDATE accounts
  SET balance_cents = balance_cents - :amountCents::bigint
  WHERE account_id = :fromAccountId::bigint
    AND balance_cents >= :amountCents::bigint
  RETURNING account_id;
`);

const creditStatement = compileNamedParameters(`
  UPDATE accounts
  SET balance_cents = balance_cents + :amountCents::bigint
  WHERE account_id = :toAccountId::bigint
  RETURNING account_id;
`);

const auditStatement = compileNamedParameters(`
  INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
  VALUES (
    :fromAccountId::bigint,
    :toAccountId::bigint,
    :amountCents::bigint,
    :note
  );
`);

function isPositiveIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
}

function validateTransfer(input: unknown): asserts input is {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
} {
  if (
    typeof input !== 'object' ||
    input === null ||
    !isPositiveIntegerString((input as { fromAccountId?: unknown }).fromAccountId) ||
    !isPositiveIntegerString((input as { toAccountId?: unknown }).toAccountId) ||
    !isPositiveIntegerString((input as { amountCents?: unknown }).amountCents) ||
    typeof (input as { note?: unknown }).note !== 'string'
  ) {
    throw new TransferError('VALIDATION', 'Invalid transfer input');
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async transfer(input) {
      if (closed) {
        throw new TransferError('APPLICATION_CLOSED', 'Application is closed');
      }

      validateTransfer(input);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const debit = bindNamedParameters(debitStatement, {
          fromAccountId: input.fromAccountId,
          amountCents: input.amountCents,
        });
        const debitResult = await client.query(debit.sql, [...debit.values]);
        if (debitResult.rowCount !== 1) {
          throw new TransferError('INSUFFICIENT_FUNDS', 'Insufficient funds');
        }

        const credit = bindNamedParameters(creditStatement, {
          toAccountId: input.toAccountId,
          amountCents: input.amountCents,
        });
        const creditResult = await client.query(credit.sql, [...credit.values]);
        if (creditResult.rowCount !== 1) {
          throw new TransferError('INSUFFICIENT_FUNDS', 'Destination account is unavailable');
        }

        const audit = bindNamedParameters(auditStatement, {
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amountCents: input.amountCents,
          note: input.note,
        });
        await client.query(audit.sql, [...audit.values]);
        await client.query('COMMIT');

        return { status: 'ok', applied: true };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },

    close() {
      if (closePromise === undefined) {
        closePromise = pool.end().then(() => {
          closed = true;
        });
      }
      return closePromise;
    },
  };
}
