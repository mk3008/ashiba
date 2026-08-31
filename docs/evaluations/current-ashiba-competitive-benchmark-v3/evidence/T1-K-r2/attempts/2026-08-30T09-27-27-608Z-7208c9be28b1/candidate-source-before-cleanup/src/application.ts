import { Generated, Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
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

type ApplicationErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_FUNDS'
  | 'APPLICATION_CLOSED';

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

interface Database {
  accounts: {
    account_id: string;
    balance_cents: string;
  };
  transfer_audit: {
    audit_id: Generated<string>;
    from_account_id: string;
    to_account_id: string;
    amount_cents: string;
    note: string;
    created_at: Generated<Date>;
  };
}

interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
}

const POSITIVE_INTEGER = /^\d+$/;

function parsePositiveInteger(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !POSITIVE_INTEGER.test(value)) {
    throw new ApplicationError('VALIDATION', `${field} must be a positive integer string`);
  }

  const parsed = BigInt(value);
  if (parsed <= 0n) {
    throw new ApplicationError('VALIDATION', `${field} must be greater than zero`);
  }

  return parsed;
}

function validateTransferInput(input: TransferInput): {
  fromAccountId: string;
  toAccountId: string;
  amountCents: bigint;
  note: string;
} {
  if (input === null || typeof input !== 'object') {
    throw new ApplicationError('VALIDATION', 'transfer input is required');
  }

  const fromAccountId = parsePositiveInteger(input.fromAccountId, 'fromAccountId');
  const toAccountId = parsePositiveInteger(input.toAccountId, 'toAccountId');
  const amountCents = parsePositiveInteger(input.amountCents, 'amountCents');

  if (typeof input.note !== 'string') {
    throw new ApplicationError('VALIDATION', 'note must be a string');
  }

  return {
    fromAccountId: fromAccountId.toString(),
    toAccountId: toAccountId.toString(),
    amountCents,
    note: input.note,
  };
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
  const schemaDb = db.withSchema(runtime.schema);
  let closed = false;
  let closing: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw new ApplicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async transfer(input) {
      ensureOpen();
      const transfer = validateTransferInput(input);

      await schemaDb.transaction().execute(async (trx) => {
        const lockedAccounts = await trx
          .selectFrom('accounts')
          .select(['account_id', 'balance_cents'])
          .where('account_id', 'in', [transfer.fromAccountId, transfer.toAccountId])
          .orderBy('account_id', 'asc')
          .forUpdate()
          .execute();

        const source = lockedAccounts.find(
          (account) => account.account_id === transfer.fromAccountId,
        );
        const destination = lockedAccounts.find(
          (account) => account.account_id === transfer.toAccountId,
        );

        if (source === undefined || destination === undefined) {
          throw new ApplicationError('VALIDATION', 'account does not exist');
        }

        if (BigInt(source.balance_cents) < transfer.amountCents) {
          throw new ApplicationError('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        await trx
          .updateTable('accounts')
          .set({
            balance_cents: sql<string>`balance_cents - ${transfer.amountCents.toString()}`,
          })
          .where('account_id', '=', transfer.fromAccountId)
          .execute();

        await trx
          .updateTable('accounts')
          .set({
            balance_cents: sql<string>`balance_cents + ${transfer.amountCents.toString()}`,
          })
          .where('account_id', '=', transfer.toAccountId)
          .execute();

        await trx
          .insertInto('transfer_audit')
          .values({
            from_account_id: transfer.fromAccountId,
            to_account_id: transfer.toAccountId,
            amount_cents: transfer.amountCents.toString(),
            note: transfer.note,
          })
          .execute();
      });

      return { status: 'ok', applied: true };
    },

    async close() {
      if (closing === undefined) {
        closing = db.destroy().then(() => {
          closed = true;
        });
      }

      await closing;
    },
  };
}
