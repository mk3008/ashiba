import { Pool, type PoolClient } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ClaimInput {
  workerId: string;
}

export interface Application {
  claim(input: ClaimInput): Promise<{ claimedWorkId: string | null }>;
  close(): Promise<void>;
}

type ApplicationErrorCode = 'VALIDATION' | 'APPLICATION_CLOSED';

class CandidateApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

function assertWorkerId(input: ClaimInput): void {
  if (typeof input?.workerId !== 'string' || input.workerId.trim().length === 0) {
    throw new CandidateApplicationError('VALIDATION', 'workerId must be a non-empty string');
  }
}

/**
 * Claims the next queued work item. The CTE locks the selected row before the
 * update; SKIP LOCKED makes parallel workers choose different queued rows.
 */
async function claimNextWorkItem(
  client: PoolClient,
  workerId: string,
): Promise<{ claimedWorkId: string | null }> {
  const result = await client.query<{ id: string }>(
    `WITH next_work_item AS (
       SELECT id
       FROM work_items
       WHERE state = 'queued'
       ORDER BY id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE work_items AS work_item
     SET state = 'claimed', claimed_by = $1
     FROM next_work_item
     WHERE work_item.id = next_work_item.id
     RETURNING work_item.id::text AS id`,
    [workerId],
  );

  return { claimedWorkId: result.rows[0]?.id ?? null };
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async claim(input: ClaimInput): Promise<{ claimedWorkId: string | null }> {
      if (closed) {
        throw new CandidateApplicationError('APPLICATION_CLOSED', 'application is closed');
      }
      assertWorkerId(input);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        try {
          const claim = await claimNextWorkItem(client, input.workerId);
          await client.query('COMMIT');
          return claim;
        } catch (error: unknown) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Preserve the mutation failure; a failed rollback cannot make it safe to continue.
          }
          throw error;
        }
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
