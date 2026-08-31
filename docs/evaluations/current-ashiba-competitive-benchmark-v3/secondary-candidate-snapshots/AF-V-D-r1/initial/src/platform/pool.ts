import { Pool } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T>;
}

/**
 * Keeps connection lifecycle policy at the application boundary.  Feature code
 * receives Drizzle's database object rather than issuing native-pg queries.
 */
export class ApplicationPoolProvider implements PoolProvider {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
