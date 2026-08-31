import { defineContract } from '@prisma/orm-postgres/contract-builder';
import postgres from '@prisma/orm-postgres/runtime';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  claim(input: { workerId: string }): Promise<{ claimedWorkId: string | null }>;
  close(): Promise<void>;
}

class CodedError extends Error implements ApplicationError {
  public readonly code: ApplicationError['code'];

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

// This workload only needs a typed raw-SQL result. The Prisma 8 contract still
// supplies the Postgres codecs and runtime used by that lane.
const contract = defineContract({});

function validateWorkerId(input: { workerId: string }): string {
  if (typeof input?.workerId !== 'string' || input.workerId.length === 0) {
    throw new CodedError('VALIDATION', 'workerId must be a non-empty string');
  }

  return input.workerId;
}

export function createApplication(runtime: Runtime): Application {
  const db = postgres({ contract, url: runtime.connectionString });
  let closed = false;

  return {
    claim: async (input) => {
      if (closed) {
        throw new CodedError('APPLICATION_CLOSED', 'application is closed');
      }

      const workerId = validateWorkerId(input);
      const plan = db.raw.sql`
        WITH next_work_item AS (
          SELECT id
          FROM work_items
          WHERE state = 'queued'
          ORDER BY id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE work_items AS work_item
        SET state = 'claimed', claimed_by = ${workerId}
        FROM next_work_item
        WHERE work_item.id = next_work_item.id
        RETURNING work_item.id
      `
        .returnsRow({ id: 'pg/int8@1' })
        .build();
      const rows = await db.runtime().query(plan);
      const claimed = rows[0];

      return { claimedWorkId: claimed === undefined ? null : String(claimed.id) };
    },
    close: async () => {
      if (closed) {
        return;
      }

      closed = true;
      await db.close();
    },
  };
}
