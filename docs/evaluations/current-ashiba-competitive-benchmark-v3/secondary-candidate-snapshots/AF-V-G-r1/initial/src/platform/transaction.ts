import type { Pool, PoolClient } from 'pg';

/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T>;
}

export function createTransactionRunner(pool: Pool): TransactionRunner {
  return {
    async inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // The original operation failure is the useful error to callers.
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
