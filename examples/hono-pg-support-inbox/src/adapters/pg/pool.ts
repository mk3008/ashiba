import { Pool, type PoolConfig } from 'pg';
import {
  type AshibaPostgresPreparationOptions,
  type AshibaPostgresQuerySource,
  preparePostgresQuery,
} from '@ashiba-ts/driver-adapter-pg';

import { logSqlExecution, type SqlExecutionLogEvent } from '#adapters/logger/appLogger.js';
import type {
  AnyFeatureQuerySource,
  AshibaQueryParams,
  AshibaQueryRow,
  FeatureQueryExecutor,
} from '#features/_shared/featureQueryExecutor.js';

export type PgConnectionSettings = {
  connectionString?: string;
  pool?: PoolConfig;
};

export type PgFeatureQueryExecutorOptions = {
  preparationOptions?: AshibaPostgresPreparationOptions & { metadata?: Record<string, unknown> };
  observer?: { emit(event: SqlExecutionLogEvent): void };
  includeUnmaskedParamsInEvents?: boolean;
};

export type PgTransactionOptions = {
  isolationLevel?: 'read committed' | 'repeatable read' | 'serializable';
  accessMode?: 'read write' | 'read only';
  deferrable?: boolean;
};

export type PgSqlClientContext = {
  isClientBorrowed: true;
  isTransactionStarted: boolean;
};

/**
 * Create an application-owned pg Pool for production or traditional tests.
 *
 * Ashiba does not own connection lifecycle or transaction policy. Keep the Pool
 * at your application boundary and pass FeatureQueryExecutor into workflows.
 */
export function createPgPool(settings: PgConnectionSettings = {}): Pool {
  const connectionString = settings.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set DATABASE_URL or pass connectionString to createPgPool.');
  }

  return new Pool({
    ...settings.pool,
    connectionString,
  });
}

/**
 * Create the SQL client that feature code should receive.
 *
 * Natural wiring:
 *   query -> feature -> sqlClient -> logger
 *
 * SQL logging is intentionally delegated to ../logger/appLogger.ts. Fill that
 * file with your application logger (pino, winston, console, etc.). This
 * application boundary prepares deterministic SQL, then directly calls native
 * `pg`. Feature code should not import pg, pino, or logger code directly.
 */
export function createPgSqlClient(
  queryable: { query(sql: string, values: readonly unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null }> },
  options: PgFeatureQueryExecutorOptions = {},
): FeatureQueryExecutor {
  const { preparationOptions, observer, includeUnmaskedParamsInEvents = false } = options;
  return {
    async query<Query extends AnyFeatureQuerySource>(query: Query, params: AshibaQueryParams<Query>): Promise<AshibaQueryRow<Query>[]> {
      const queryAnalysis = query.queryModel.analysis;
      const postgresQuery: AshibaPostgresQuerySource<AshibaQueryParams<Query>, AshibaQueryRow<Query>> = {
          sql: query.sql,
          sqlPath: query.sqlPath,
          queryModel: query.queryModel,
      };
      const { metadata: suppliedMetadata, ...postgresPreparationOptions } = preparationOptions ?? {};
      const prepared = preparePostgresQuery(
        postgresQuery,
        { ...params },
        {
          ...postgresPreparationOptions,
          optionalConditionCompression: query.optionalConditionCompression ?? postgresPreparationOptions.optionalConditionCompression,
        },
      );
      const startedAt = Date.now();
      const metadata = {
        ...suppliedMetadata,
        sqlId: query.metadata?.sqlId ?? query.id,
        queryId: query.metadata?.queryId ?? query.id,
        sqlPath: query.metadata?.sqlPath ?? query.sqlPath,
        queryModelSourceHash: queryAnalysis.sourceHash,
        queryModelStatementKind: queryAnalysis.statementKind,
        queryModelRootQueryShape: queryAnalysis.rootQueryShape,
        queryModelOptionalConditionCompression: queryAnalysis.optionalConditionCompression?.enabled,
        queryModelSafeSortInsertionStatus: queryAnalysis.safeSort?.insertion?.status,
      };
      const emit = (event: SqlExecutionLogEvent) => {
        logSqlExecution(event);
        observer?.emit(event);
      };
      emit({
        phase: 'start',
        metadata,
        sourceSql: prepared.sourceSql,
        compiledSql: prepared.sql,
        parameterNames: prepared.parameterNames,
        maskedParams: maskPreparedParams(prepared.values),
        ...(includeUnmaskedParamsInEvents ? { params: prepared.values } : {}),
      });
      try {
        const result = await queryable.query(prepared.sql, prepared.values);
        emit({
          phase: 'end',
          metadata,
          sourceSql: prepared.sourceSql,
          compiledSql: prepared.sql,
          parameterNames: prepared.parameterNames,
          maskedParams: maskPreparedParams(prepared.values),
          ...(includeUnmaskedParamsInEvents ? { params: prepared.values } : {}),
          elapsedMs: Date.now() - startedAt,
          rowCount: result.rowCount ?? result.rows.length,
        });
        return result.rows as AshibaQueryRow<Query>[];
      } catch (error) {
        emit({
          phase: 'error',
          metadata,
          sourceSql: prepared.sourceSql,
          compiledSql: prepared.sql,
          parameterNames: prepared.parameterNames,
          maskedParams: maskPreparedParams(prepared.values),
          ...(includeUnmaskedParamsInEvents ? { params: prepared.values } : {}),
          elapsedMs: Date.now() - startedAt,
          error,
        });
        throw error;
      }
    },
  };
}

function maskPreparedParams(values: readonly unknown[]): readonly string[] {
  return values.map((value) => value === null || value === undefined ? '<nullish>' : '<masked>');
}

/**
 * Low-level compatibility alias. Prefer createPgSqlClient in new application code
 * so logger wiring stays visibly attached to the SQL client boundary.
 */
export function createPgFeatureQueryExecutor(
  queryable: { query(sql: string, values: readonly unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null }> },
  options: PgFeatureQueryExecutorOptions = {},
): FeatureQueryExecutor {
  return createPgSqlClient(queryable, options);
}

/**
 * Borrow a pg client, expose only the guarded FeatureQueryExecutor, and release
 * the client after the callback settles.
 */
export async function withPgFeatureQueryExecutor<T>(
  pool: Pool,
  callback: (executor: FeatureQueryExecutor, context: PgSqlClientContext) => Promise<T>,
  options: PgFeatureQueryExecutorOptions = {},
): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(createPgSqlClient(client, options), {
      isClientBorrowed: true,
      isTransactionStarted: false,
    });
  } finally {
    client.release();
  }
}

/**
 * Run application-owned work inside a pg transaction.
 *
 * Standard path:
 *   await withPgTransaction(pool, async (executor) => { ... });
 *
 * Advanced but frequent pg controls stay grouped under options.transaction.
 * Keep rare or application-specific policy in this customer-owned file instead
 * of growing every feature call site.
 *
 * Frequent transaction controls are first-class so customer code can stay
 * boring. For rarer pg controls, edit this starter file near the BEGIN query.
 *
 * Use this across feature/usecase boundaries by passing the same executor into
 * each feature call inside the callback. That keeps all feature SQL on the same
 * borrowed pg client and transaction.
 *
 * This helper is starter code, not an Ashiba runtime requirement. Edit or
 * replace it when your application needs a different transaction policy.
 */
export async function withPgTransaction<T>(
  pool: Pool,
  callback: (executor: FeatureQueryExecutor, context: PgSqlClientContext) => Promise<T>,
  options: PgFeatureQueryExecutorOptions & { transaction?: PgTransactionOptions } = {},
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(renderBeginTransactionSql(options.transaction));
    try {
      const result = await callback(createPgSqlClient(client, options), {
        isClientBorrowed: true,
        isTransactionStarted: true,
      });
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  } finally {
    client.release();
  }
}

function renderBeginTransactionSql(options: PgTransactionOptions = {}): string {
  const parts = ['begin'];
  if (options.isolationLevel) {
    parts.push('isolation level', options.isolationLevel);
  }
  if (options.accessMode) {
    parts.push(options.accessMode);
  }
  if (options.deferrable !== undefined) {
    parts.push(options.deferrable ? 'deferrable' : 'not deferrable');
  }
  return parts.join(' ');
}
