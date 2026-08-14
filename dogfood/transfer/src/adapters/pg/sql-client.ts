import { createPostgresAdapter, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import type {
  AnyFeatureQuerySource,
  AshibaQueryParams,
  AshibaQueryRow,
  FeatureQueryExecutor,
} from '#features/_shared/featureQueryExecutor.js';

/**
 * Adapt a node-postgres `pg`-style queryable (Client or Pool) into a feature query executor.
 *
 * Generated query sources keep the reviewed SQL snapshot and binding metadata.
 * The thin adapter compiles named parameters to node-postgres placeholders
 * immediately before execution.
 *
 * Usage:
 *   // This runtime example uses DATABASE_URL for application code.
 *   // Ashiba CLI itself does not read DATABASE_URL implicitly.
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   const executor = fromPg(pool);
 *   const users = await executeListUsersQuery(executor, { limit: 10 });
 */
export function fromPg(queryable: {
  query(text: string, values: readonly unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null }>;
}): FeatureQueryExecutor {
  const adapter = createPostgresAdapter(queryable);
  return {
    async query<Query extends AnyFeatureQuerySource>(query: Query, params: AshibaQueryParams<Query>): Promise<AshibaQueryRow<Query>[]> {
      const postgresQuery: AshibaPostgresQuerySource<AshibaQueryParams<Query>, AshibaQueryRow<Query>> = {
        sql: query.sql,
        sqlPath: query.sqlPath,
        queryModel: query.queryModel,
        metadata: query.metadata,
      };
      const result = await adapter.execute(postgresQuery, { ...params });
      return result.rows;
    },
  };
}
