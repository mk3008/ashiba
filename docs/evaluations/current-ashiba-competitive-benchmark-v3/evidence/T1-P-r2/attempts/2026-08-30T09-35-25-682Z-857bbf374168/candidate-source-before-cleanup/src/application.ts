import postgres from '@prisma/orm-postgres/runtime';

import type { Contract } from './prisma/contract.d.js';
import contractJson from './prisma/contract.json' with { type: 'json' };

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

export interface Application {
  transfer(input: TransferInput): Promise<{ status: 'ok'; applied: true }>;
  close(): Promise<void>;
}

type ErrorCode = 'VALIDATION' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';

class CandidateError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

function validationError(message: string): CandidateError {
  return new CandidateError('VALIDATION', message);
}

function parsePositiveBigInt(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    throw validationError(`${field} must be a base-10 integer string`);
  }

  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > MAX_POSTGRES_BIGINT) {
    throw validationError(`${field} must be a positive PostgreSQL bigint`);
  }

  return parsed;
}

function parseNote(value: unknown): string {
  if (typeof value !== 'string') {
    throw validationError('note must be a string');
  }

  return value;
}

function parseTransferInput(input: unknown): {
  fromAccountId: bigint;
  toAccountId: bigint;
  amountCents: bigint;
  note: string;
} {
  if (typeof input !== 'object' || input === null) {
    throw validationError('transfer input must be an object');
  }

  const value = input as Record<string, unknown>;
  return {
    fromAccountId: parsePositiveBigInt(value['fromAccountId'], 'fromAccountId'),
    toAccountId: parsePositiveBigInt(value['toAccountId'], 'toAccountId'),
    amountCents: parsePositiveBigInt(value['amountCents'], 'amountCents'),
    note: parseNote(value['note']),
  };
}

export function createApplication(runtime: Runtime): Application {
  // The runner supplies a nonce-schema search path. Table names remain static,
  // and every transfer value is parameterized by Prisma's raw-SQL lane.
  const db = postgres<Contract>({
    contractJson,
    url: runtime.connectionString,
  });
  let closed = false;

  return {
    async transfer(input: TransferInput): Promise<{ status: 'ok'; applied: true }> {
      if (closed) {
        throw new CandidateError('APPLICATION_CLOSED', 'application is closed');
      }

      const { fromAccountId, toAccountId, amountCents, note } = parseTransferInput(input);

      await db.transaction(async (tx) => {
        const debit = db.raw.sql`
          UPDATE accounts
          SET balance_cents = balance_cents - ${amountCents}
          WHERE account_id = ${fromAccountId}
            AND balance_cents >= ${amountCents}
        `.affectedCount().build();
        const debited = await tx.execute(debit);

        if (debited.affectedRows !== 1) {
          throw new CandidateError('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        const credit = db.raw.sql`
          UPDATE accounts
          SET balance_cents = balance_cents + ${amountCents}
          WHERE account_id = ${toAccountId}
        `.affectedCount().build();
        const credited = await tx.execute(credit);

        if (credited.affectedRows !== 1) {
          throw validationError('toAccountId does not identify an account');
        }

        const audit = db.raw.sql`
          INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
          VALUES (${fromAccountId}, ${toAccountId}, ${amountCents}, ${note})
        `.affectedCount().build();
        await tx.execute(audit);
      });

      return { status: 'ok', applied: true };
    },

    async close(): Promise<void> {
      if (closed) {
        return;
      }

      closed = true;
      await db.close();
    },
  };
}
