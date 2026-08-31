import { Pool } from 'pg';

import { claimQueuedWork } from './generated/queries_sql.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Application {
  claim(input: { workerId: string }): Promise<{ claimedWorkId: string | null }>;
  close(): Promise<void>;
}

class ApplicationClosedError extends Error {
  readonly code = 'APPLICATION_CLOSED' as const;

  constructor() {
    super('Application is closed');
    this.name = 'ApplicationClosedError';
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async claim(input) {
      if (closed) {
        throw new ApplicationClosedError();
      }

      const row = await claimQueuedWork(pool, { claimedBy: input.workerId });
      return { claimedWorkId: row?.id ?? null };
    },

    close() {
      if (!closePromise) {
        closed = true;
        closePromise = pool.end();
      }
      return closePromise;
    },
  };
}
