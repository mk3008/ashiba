import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './prisma/contract.d.ts';
import contractJson from './prisma/contract.json' with { type: 'json' };

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'APPLICATION_CLOSED';
}

export interface Application {
  claim(input: { workerId: string }): Promise<{ claimedWorkId: string | null }>;
  close(): Promise<void>;
}

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  return Object.assign(new Error(message), { code });
}

function assertWorkerId(input: { workerId: string }): void {
  if (typeof input?.workerId !== 'string' || input.workerId.trim().length === 0) {
    throw applicationError('VALIDATION', 'workerId must be a non-empty string');
  }
}

/**
 * The Prisma raw lane is used only for this PostgreSQL-specific atomic claim.
 * `FOR UPDATE SKIP LOCKED` makes each concurrent claimant lock a different
 * queued row, while this single UPDATE preserves trigger rollback semantics.
 */
export function createApplication(runtime: Runtime): Application {
  const db = postgres<Contract>({
    contractJson,
    url: runtime.connectionString,
  });
  let closed = false;

  return {
    async claim(input) {
      if (closed) {
        throw applicationError('APPLICATION_CLOSED', 'application is closed');
      }
      assertWorkerId(input);

      const plan = db.raw.sql`
        WITH next_item AS (
          SELECT id
          FROM work_items
          WHERE state = 'queued'
          ORDER BY id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE work_items AS item
        SET state = 'claimed', claimed_by = ${input.workerId}
        FROM next_item
        WHERE item.id = next_item.id
        RETURNING item.id::text AS "claimedWorkId"
      `
        .returnsRow({ claimedWorkId: { codecId: 'pg/text@1' } })
        .build();
      const rows = await db.runtime().query(plan);

      return { claimedWorkId: rows[0]?.claimedWorkId ?? null };
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
