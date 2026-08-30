import { Pool } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class NativePgPoolProvider implements PoolProvider {
  private readonly pool: Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  public async withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
