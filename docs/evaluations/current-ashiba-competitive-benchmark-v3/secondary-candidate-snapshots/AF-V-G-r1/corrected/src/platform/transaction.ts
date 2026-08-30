import type { PoolClient } from 'pg';

import type { PoolProvider } from './pool.js';

/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T>;
}

export class NativePgTransactionRunner implements TransactionRunner {
  public constructor(private readonly pools: PoolProvider) {}

  public async inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.pools.withPool(async (pool) => {
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
          // The original database error is the useful failure to report.
        }
        throw error;
      } finally {
        client.release();
      }
    });
  }
}
