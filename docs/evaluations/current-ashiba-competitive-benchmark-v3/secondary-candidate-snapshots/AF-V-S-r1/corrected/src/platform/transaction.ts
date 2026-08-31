import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { Queryable } from './pool.js';

/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: Queryable) => Promise<T>): Promise<T>;
}

export class NativePgTransactionRunner implements TransactionRunner {
  constructor(private readonly pool: Pool) {}

  async inTransaction<T>(operation: (client: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The original failure is the useful error for callers.
  }
}
