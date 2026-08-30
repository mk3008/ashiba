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

const CLAIM_NEXT_WORK_ITEM_SQL = `
  WITH next_work_item AS (
    SELECT id
    FROM work_items
    WHERE state = 'queued'
    ORDER BY id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE work_items AS work_item
  SET
    state = 'claimed',
    claimed_by = :workerId
  FROM next_work_item
  WHERE work_item.id = next_work_item.id
  RETURNING work_item.id::text AS id
`;

const claimNextWorkItem = compileNamedParameters(CLAIM_NEXT_WORK_ITEM_SQL);

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateWorkerId(workerId: unknown): asserts workerId is string {
  if (typeof workerId !== 'string' || workerId.trim().length === 0) {
    throw applicationError('VALIDATION', 'workerId must be a non-empty string');
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closing: Promise<void> | undefined;

  return {
    async claim(input) {
      if (closed) {
        throw applicationError('APPLICATION_CLOSED', 'application is closed');
      }

      validateWorkerId(input?.workerId);
      const query = bindNamedParameters(claimNextWorkItem, { workerId: input.workerId });
      const result = await pool.query<{ id: string }>(query.sql, Array.from(query.values));

      return { claimedWorkId: result.rows[0]?.id ?? null };
    },

    async close() {
      if (!closing) {
        closed = true;
        closing = pool.end();
      }
      await closing;
    },
  };
}
