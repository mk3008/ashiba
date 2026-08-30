import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { bigint, pgTable, text } from 'drizzle-orm/pg-core';
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

const workItems = pgTable('work_items', {
  id: bigint('id', { mode: 'bigint' }).primaryKey(),
  state: text('state').notNull(),
  claimedBy: text('claimed_by'),
});

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function requireWorkerId(workerId: unknown): string {
  if (typeof workerId !== 'string' || workerId.length === 0) {
    throw applicationError('VALIDATION', 'workerId must be a non-empty string');
  }
  return workerId;
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle(pool);
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function assertOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async claim(input): Promise<{ claimedWorkId: string | null }> {
      assertOpen();
      const workerId = requireWorkerId(input?.workerId);

      return db.transaction(async (tx) => {
        const [nextItem] = await tx
          .select({ id: workItems.id })
          .from(workItems)
          .where(eq(workItems.state, 'queued'))
          .orderBy(asc(workItems.id))
          .for('update', { skipLocked: true })
          .limit(1);

        if (nextItem === undefined) {
          return { claimedWorkId: null };
        }

        const [claimedItem] = await tx
          .update(workItems)
          .set({ state: 'claimed', claimedBy: workerId })
          .where(eq(workItems.id, nextItem.id))
          .returning({ id: workItems.id });

        return { claimedWorkId: claimedItem.id.toString() };
      });
    },

    close(): Promise<void> {
      if (closePromise !== undefined) {
        return closePromise;
      }

      closed = true;
      closePromise = pool.end();
      return closePromise;
    },
  };
}
