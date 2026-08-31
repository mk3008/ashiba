import { Kysely, PostgresDialect } from 'kysely';
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

interface Database {
  work_items: {
    id: bigint;
    state: 'queued' | 'claimed';
    claimed_by: string | null;
  };
}

function applicationError(
  code: ApplicationError['code'],
  message: string,
): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function assertWorkerId(workerId: unknown): asserts workerId is string {
  if (typeof workerId !== 'string' || workerId.trim().length === 0) {
    throw applicationError('VALIDATION', 'workerId must be a non-empty string');
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });

  // Kysely's PostgreSQL dialect owns all workload SQL; pg supplies only its pool.
  const database = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  }).withSchema(runtime.schema);

  let closed = false;
  let closing: Promise<void> | undefined;

  return {
    async claim(input): Promise<{ claimedWorkId: string | null }> {
      if (closed) {
        throw applicationError('APPLICATION_CLOSED', 'application is closed');
      }

      assertWorkerId(input?.workerId);

      return database.transaction().execute(async (transaction) => {
        const nextItem = await transaction
          .selectFrom('work_items')
          .select('id')
          .where('state', '=', 'queued')
          .orderBy('id', 'asc')
          .limit(1)
          .forUpdate()
          .skipLocked()
          .executeTakeFirst();

        if (nextItem === undefined) {
          return { claimedWorkId: null };
        }

        await transaction
          .updateTable('work_items')
          .set({ state: 'claimed', claimed_by: input.workerId })
          .where('id', '=', nextItem.id)
          .executeTakeFirstOrThrow();

        return { claimedWorkId: nextItem.id.toString() };
      });
    },

    close(): Promise<void> {
      if (closing === undefined) {
        closed = true;
        closing = database.destroy();
      }
      return closing;
    },
  };
}
