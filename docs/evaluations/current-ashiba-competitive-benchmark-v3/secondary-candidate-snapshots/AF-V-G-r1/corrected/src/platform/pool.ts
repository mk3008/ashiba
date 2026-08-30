import { Pool } from 'pg';

/** Application-owned native-pg pool seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class NativePgPoolProvider implements PoolProvider {
  private readonly pool: Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  public withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }

  public close(): Promise<void> {
    return this.pool.end();
  }
}
