import { Pool } from "pg";
import {
  beginTransfer,
  commitTransfer,
  creditAccount,
  debitAccount,
  recordTransferAudit,
  rollbackTransfer,
} from "./generated/transfer_sql.js";

type ApplicationErrorCode =
  | "VALIDATION"
  | "INSUFFICIENT_FUNDS"
  | "APPLICATION_CLOSED";

class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode) {
    super(code);
    this.name = "ApplicationError";
    this.code = code;
  }
}

const MAX_BIGINT = 9_223_372_036_854_775_807n;

function positiveBigintString(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new ApplicationError("VALIDATION");
  }

  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > MAX_BIGINT) {
    throw new ApplicationError("VALIDATION");
  }

  return value;
}

interface TransferInput {
  fromAccountId: unknown;
  toAccountId: unknown;
  amountCents: unknown;
  note: unknown;
}

function validateTransferInput(input: unknown): {
  fromAccountId: string;
  toAccountId: string;
  amountCents: string;
  note: string;
} {
  if (typeof input !== "object" || input === null) {
    throw new ApplicationError("VALIDATION");
  }

  const transfer = input as TransferInput;
  if (typeof transfer.note !== "string" || transfer.note.includes("\0")) {
    throw new ApplicationError("VALIDATION");
  }

  return {
    fromAccountId: positiveBigintString(transfer.fromAccountId),
    toAccountId: positiveBigintString(transfer.toAccountId),
    amountCents: positiveBigintString(transfer.amountCents),
    note: transfer.note,
  };
}

export interface Runtime {
  connectionString: string;
  schema: string;
}

export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw new ApplicationError("APPLICATION_CLOSED");
    }
  }

  return {
    async transfer(input: unknown): Promise<{ status: "ok"; applied: true }> {
      ensureOpen();
      const args = validateTransferInput(input);
      const client = await pool.connect();
      let transactionOpen = false;

      try {
        await beginTransfer(client);
        transactionOpen = true;

        const debited = await debitAccount(client, {
          accountId: args.fromAccountId,
          amountCents: args.amountCents,
        });
        if (debited === null) {
          await rollbackTransfer(client);
          transactionOpen = false;
          throw new ApplicationError("INSUFFICIENT_FUNDS");
        }

        const credited = await creditAccount(client, {
          accountId: args.toAccountId,
          amountCents: args.amountCents,
        });
        if (credited === null) {
          throw new Error("transfer recipient was not found");
        }

        await recordTransferAudit(client, args);
        await commitTransfer(client);
        transactionOpen = false;
        return { status: "ok", applied: true };
      } catch (error) {
        if (transactionOpen) {
          try {
            await rollbackTransfer(client);
          } catch {
            // The original operation error is the useful failure for callers.
          }
        }
        throw error;
      } finally {
        client.release();
      }
    },

    close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      return closePromise;
    },
  };
}
