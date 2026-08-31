import { Pool, type QueryResultRow } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T>;
}

export class NativePgPool implements PoolProvider {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }

  async query<Row extends QueryResultRow>(sql: string, values: readonly unknown[]): Promise<Row[]> {
    const result = await this.pool.query<Row>(sql, [...values]);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
