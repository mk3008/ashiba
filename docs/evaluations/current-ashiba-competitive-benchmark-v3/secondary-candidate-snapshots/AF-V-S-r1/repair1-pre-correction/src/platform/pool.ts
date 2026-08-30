import type { Pool } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T>;
}

export class PgPoolProvider implements PoolProvider {
  constructor(private readonly pool: Pool) {}

  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }
}
