import { preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import type {
  AnyFeatureQuerySource,
  AshibaQueryParams,
  AshibaQueryRow,
  FeatureQueryExecutor,
} from '#features/_shared/featureQueryExecutor.js';

/**
 * Adapt a node-postgres `pg`-style queryable (Client or Pool) into a feature query executor.
 *
 * Generated query sources keep the reviewed canonical SQL and binding metadata.
 * Ashiba prepares positional SQL and ordered values; the application invokes the
 * native driver, owns its pool, and keeps transaction policy at this boundary.
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
  return {
    async query<Query extends AnyFeatureQuerySource>(query: Query, params: AshibaQueryParams<Query>): Promise<AshibaQueryRow<Query>[]> {
      const postgresQuery: AshibaPostgresQuerySource<AshibaQueryParams<Query>, AshibaQueryRow<Query>> = {
        sql: query.sql,
        sqlPath: query.sqlPath,
        queryModel: query.queryModel,
      };
      const prepared = preparePostgresQuery(postgresQuery, { ...params }, {
        optionalConditionCompression: query.optionalConditionCompression,
      });
      const result = await queryable.query(prepared.sql, prepared.values);
      return result.rows as AshibaQueryRow<Query>[];
    },
  };
}
