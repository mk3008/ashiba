import type { Pool, PoolClient } from 'pg';

/** Application-owned transaction seam; its policy is intentionally tool-neutral. */
export interface TransactionRunner {
  inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T>;
}

export class NativePgTransactionRunner implements TransactionRunner {
  constructor(private readonly pool: Pool) {}

  async inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the database error that caused the transaction to fail.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
