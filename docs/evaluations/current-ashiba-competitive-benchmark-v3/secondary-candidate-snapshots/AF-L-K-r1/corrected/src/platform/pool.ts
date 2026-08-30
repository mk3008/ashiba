/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T>;
}

import { Pool } from 'pg';

/** The Kysely PostgreSQL dialect receives this ordinary application-owned pool. */
export class NativePgPoolProvider implements PoolProvider {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }
}
