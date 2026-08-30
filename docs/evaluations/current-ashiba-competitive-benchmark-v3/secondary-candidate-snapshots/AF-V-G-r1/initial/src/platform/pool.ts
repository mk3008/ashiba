import { Pool } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Pool) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * The pool remains an application boundary rather than a ticket feature
 * detail. Ticket use cases receive the small PoolProvider seam below.
 */
export function createNativePool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export function createPoolProvider(pool: Pool): PoolProvider {
  return {
    withPool: (operation) => operation(pool),
    close: () => pool.end(),
  };
}
