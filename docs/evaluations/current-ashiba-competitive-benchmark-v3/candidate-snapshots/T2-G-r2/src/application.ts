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

class CodedError extends Error implements ApplicationError {
  public readonly code: ApplicationError['code'];

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

/*
 * Application-owned input validation: a worker ID is a non-empty string after
 * trimming whitespace. The value is always bound as $1; it is never SQL text.
 * This workload has no dynamic SQL identifiers or other finite SQL mapping.
 */
function validateWorkerId(input: { workerId: string }): string {
  if (typeof input?.workerId !== 'string' || input.workerId.trim().length === 0) {
    throw new CodedError('VALIDATION', 'workerId must be a non-empty string');
  }

  return input.workerId;
}

const CLAIM_NEXT_QUEUED_ITEM = `
  WITH next_item AS (
    SELECT id
    FROM work_items
    WHERE state = 'queued'
    ORDER BY id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE work_items AS item
  SET state = 'claimed', claimed_by = $1
  FROM next_item
  WHERE item.id = next_item.id
  RETURNING item.id::text AS "claimedWorkId"
`;

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closePromise: Promise<void> | undefined;

  function assertOpen(): void {
    if (closePromise !== undefined) {
      throw new CodedError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async claim(input): Promise<{ claimedWorkId: string | null }> {
      assertOpen();
      const workerId = validateWorkerId(input);
      const result = await pool.query<{ claimedWorkId: string }>(
        CLAIM_NEXT_QUEUED_ITEM,
        [workerId],
      );

      return { claimedWorkId: result.rows[0]?.claimedWorkId ?? null };
    },

    close(): Promise<void> {
      closePromise ??= pool.end();
      return closePromise;
    },
  };
}
