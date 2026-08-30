import postgres from '@prisma/orm-postgres/runtime';
import { defineContract } from '@prisma/orm-postgres/contract-builder';

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

class CodedError extends Error implements ApplicationError {
  readonly code: ApplicationError['code'];

  constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

const rawOnlyContract = defineContract(
  {},
  () => ({}),
);

function positiveInteger(value: string, field: string): bigint {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new CodedError('VALIDATION', `${field} must be a positive base-10 integer string`);
  }

  return BigInt(value);
}

function validateInput(input: {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
}): { fromAccountId: bigint; toAccountId: bigint; amountCents: bigint; note: string } {
  if (!input || typeof input !== 'object' || typeof input.note !== 'string') {
    throw new CodedError('VALIDATION', 'transfer input is malformed');
  }

  if (typeof input.fromAccountId !== 'string' || typeof input.toAccountId !== 'string' || typeof input.amountCents !== 'string') {
    throw new CodedError('VALIDATION', 'account IDs and amountCents must be strings');
  }

  return {
    fromAccountId: positiveInteger(input.fromAccountId, 'fromAccountId'),
    toAccountId: positiveInteger(input.toAccountId, 'toAccountId'),
    amountCents: positiveInteger(input.amountCents, 'amountCents'),
    note: input.note,
  };
}

export function createApplication(runtime: Runtime): Application {
  let closed = false;

  // The runner supplies the nonce schema through the candidate role's search_path.
  // This contract intentionally has no models: the frozen runner owns DDL. The
  // Prisma raw lane is used only for PostgreSQL's guarded debit expression.
  const db = postgres({
    contract: rawOnlyContract,
    url: runtime.connectionString,
    verifyMarker: false,
  });

  function requireOpen(): void {
    if (closed) {
      throw new CodedError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async transfer(input) {
      requireOpen();
      const { fromAccountId, toAccountId, amountCents, note } = validateInput(input);

      return db.transaction(async (tx) => {
        const debitPlan = db.raw.sql`
          UPDATE accounts
          SET balance_cents = balance_cents - ${amountCents}
          WHERE account_id = ${fromAccountId}
            AND balance_cents >= ${amountCents}
          RETURNING account_id AS "accountId"
        `.returnsRow({ accountId: 'pg/int8@1' }).build();
        const debited = await tx.query(debitPlan);

        if (debited.length !== 1) {
          throw new CodedError('INSUFFICIENT_FUNDS', 'insufficient funds');
        }

        const creditPlan = db.raw.sql`
          UPDATE accounts
          SET balance_cents = balance_cents + ${amountCents}
          WHERE account_id = ${toAccountId}
        `.affectedCount().build();
        await tx.execute(creditPlan);

        const auditPlan = db.raw.sql`
          INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
          VALUES (${fromAccountId}, ${toAccountId}, ${amountCents}, ${note})
        `.affectedCount().build();
        await tx.execute(auditPlan);

        return { status: 'ok' as const, applied: true as const };
      });
    },

    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await db.close();
    },
  };
}
