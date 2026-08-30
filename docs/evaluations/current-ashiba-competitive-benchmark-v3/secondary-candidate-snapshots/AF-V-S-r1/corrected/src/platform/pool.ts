import type { Pool, QueryResultRow } from 'pg';

/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: Queryable) => Promise<T>): Promise<T>;
}

/** The subset generated sqlc query modules need from node-postgres. */
export interface Queryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

export class NativePgPoolProvider implements PoolProvider {
  constructor(private readonly pool: Pool) {}

  withPool<T>(operation: (pool: Queryable) => Promise<T>): Promise<T> {
    return operation(this.pool);
  }
}
