/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: unknown) => Promise<T>): Promise<T>;
}

import type { Pool, PoolClient } from 'pg';

export class PgTransactionRunner {
  constructor(private readonly pool: Pool) {}

  async inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
