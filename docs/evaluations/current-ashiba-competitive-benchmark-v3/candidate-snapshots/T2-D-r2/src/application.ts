import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

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

function applicationError(message: string, code: ApplicationError['code']): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateRuntime(runtime: Runtime): void {
  if (typeof runtime.connectionString !== 'string' || runtime.connectionString.length === 0) {
    throw applicationError('connectionString is required', 'VALIDATION');
  }

  if (typeof runtime.schema !== 'string' || runtime.schema.length === 0) {
    throw applicationError('schema is required', 'VALIDATION');
  }
}

function validateWorkerId(workerId: unknown): asserts workerId is string {
  if (typeof workerId !== 'string' || workerId.trim().length === 0) {
    throw applicationError('workerId must be a non-empty string', 'VALIDATION');
  }
}

/**
 * Builds the T2 application. The claim statement locks one queued row and
 * updates that exact row in the same transaction, so competing workers skip
 * locks already held by another worker.
 */
export function createApplication(runtime: Runtime): Application {
  validateRuntime(runtime);

  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle({ client: pool });
  const workItems = sql`${sql.identifier(runtime.schema)}.${sql.identifier('work_items')}`;
  let closed = false;
  let closing: Promise<void> | undefined;

  const assertOpen = (): void => {
    if (closed) {
      throw applicationError('application is closed', 'APPLICATION_CLOSED');
    }
  };

  return {
    async claim(input) {
      assertOpen();
      validateWorkerId(input?.workerId);

      return db.transaction(async (tx) => {
        const result = await tx.execute<{ id: string | number | bigint }>(sql`
          WITH next_work_item AS (
            SELECT id
            FROM ${workItems}
            WHERE state = 'queued'
            ORDER BY id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE ${workItems} AS item
          SET state = 'claimed', claimed_by = ${input.workerId}
          FROM next_work_item
          WHERE item.id = next_work_item.id
          RETURNING item.id
        `);

        const claimed = result.rows[0];
        return { claimedWorkId: claimed === undefined ? null : String(claimed.id) };
      });
    },

    async close() {
      if (closing !== undefined) {
        return closing;
      }

      closed = true;
      closing = pool.end();
      return closing;
    },
  };
}
