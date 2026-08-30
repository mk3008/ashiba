import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
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

const claimSql = `
WITH next_work_item AS (
  SELECT id
  FROM work_items
  WHERE state = 'queued'
  ORDER BY id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE work_items AS item
SET state = 'claimed', claimed_by = :workerId
FROM next_work_item AS next
WHERE item.id = next.id
RETURNING item.id::text AS claimed_work_id;
`;

const preparedClaim = compileNamedParameters(claimSql);

function applicationError(
  code: ApplicationError['code'],
  message: string,
): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateWorkerId(workerId: unknown): asserts workerId is string {
  if (typeof workerId !== 'string' || !/^[1-9][0-9]*$/.test(workerId)) {
    throw applicationError('VALIDATION', 'workerId must be a positive base-10 integer string');
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async claim(input: { workerId: string }): Promise<{ claimedWorkId: string | null }> {
      if (closed) {
        throw applicationError('APPLICATION_CLOSED', 'Application is closed');
      }

      const workerId = input?.workerId;
      validateWorkerId(workerId);
      const query = bindNamedParameters(preparedClaim, { workerId });
      const result = await pool.query<{ claimed_work_id: string }>(query.sql, [...query.values]);

      return { claimedWorkId: result.rows[0]?.claimed_work_id ?? null };
    },

    async close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
