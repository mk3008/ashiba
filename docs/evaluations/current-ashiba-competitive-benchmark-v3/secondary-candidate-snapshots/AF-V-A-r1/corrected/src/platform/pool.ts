import { Pool } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class NativePgPoolProvider implements PoolProvider {
  private readonly pool: Pool;
  private closePromise: Promise<void> | undefined;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }

  close(): Promise<void> {
    this.closePromise ??= this.pool.end();
    return this.closePromise;
  }
}
