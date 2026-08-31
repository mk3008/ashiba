import { Pool } from 'pg';

import { claimQueuedWork } from './generated/claim_sql.js';

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

class ErrorWithCode extends Error implements ApplicationError {
  public readonly code: ApplicationError['code'];

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const ensureOpen = (): void => {
    if (closed) {
      throw new ErrorWithCode('APPLICATION_CLOSED', 'Application is closed');
    }
  };

  return {
    async claim(input): Promise<{ claimedWorkId: string | null }> {
      ensureOpen();
      if (typeof input?.workerId !== 'string' || input.workerId.length === 0) {
        throw new ErrorWithCode('VALIDATION', 'workerId must be a non-empty string');
      }

      const row = await claimQueuedWork(pool, { claimedBy: input.workerId });
      return { claimedWorkId: row?.id ?? null };
    },

    async close(): Promise<void> {
      if (!closePromise) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
