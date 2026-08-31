/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T>;
}

import { Pool } from 'pg';

export class PgPoolProvider {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
