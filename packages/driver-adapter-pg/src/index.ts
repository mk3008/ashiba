import { createHash } from 'node:crypto';
import {
  type AshibaMaskPolicy,
  type AshibaQueryModelAnalysis,
  type AshibaSortInput,
  type AshibaSortProfile,
  type AshibaSqlExecutionMetadata,
  type AshibaSqlExecutionObserver,
  AshibaSortError,
  maskParams,
  normalizeError,
  renderSafeOrderBy,
} from '@ashiba/driver-adapter-core';

/**
 * Minimal pg-compatible query result consumed by the adapter.
 */
export type NodePostgresQueryResult<Row = unknown> = {
  rows: Row[];
  rowCount?: number | null;
};

/**
 * Minimal pg-compatible client or pool contract.
 */
export type NodePostgresQueryable<Row = unknown> = {
  query(sql: string, values: readonly unknown[]): Promise<NodePostgresQueryResult<Row>>;
};

/**
 * Adapter-level options for execution observation and parameter masking.
 */
export type AshibaPostgresAdapterOptions = {
  observer?: AshibaSqlExecutionObserver;
  maskPolicy?: AshibaMaskPolicy;
  includeUnmaskedParamsInEvents?: boolean;
};

/**
 * CLI-generated query model required by the PostgreSQL adapter.
 */
export type AshibaPostgresQueryModel = {
  analysis: AshibaQueryModelAnalysis;
  bindings?: {
    postgres?: {
      sourceHash?: string;
      sql: string;
      orderedNames: readonly string[];
      safeSortInsertion?: {
        index: number;
      };
    };
  };
};

/**
 * File-backed SQL query source generated or loaded from a reviewed SQL file.
 */
export type AshibaPostgresQuerySource = {
  sql: string;
  sqlPath: string;
  queryModel: AshibaPostgresQueryModel;
  metadata?: AshibaSqlExecutionMetadata;
};

/**
 * Per-execution metadata and safe sort options for PostgreSQL execution.
 */
export type AshibaPostgresExecuteOptions = {
  metadata?: AshibaSqlExecutionMetadata;
  /**
   * @deprecated Prefer putting query model metadata on AshibaPostgresQuerySource.
   */
  queryModel?: AshibaPostgresQueryModel;
  sortProfile?: AshibaSortProfile;
  sort?: readonly AshibaSortInput[];
};

/**
 * Thin PostgreSQL adapter interface exposed to application code.
 */
export type AshibaPostgresAdapter = {
  execute<Row = unknown>(
    query: AshibaPostgresQuerySource,
    params?: Readonly<Record<string, unknown>>,
    options?: AshibaPostgresExecuteOptions,
  ): Promise<NodePostgresQueryResult<Row>>;
};

/**
 * Error raised when provided named parameters do not match query model metadata.
 */
export class AshibaParameterError extends Error {
  readonly code: 'ASHIBA_MISSING_PARAMETER' | 'ASHIBA_UNUSED_PARAMETER';
  readonly parameterNames: string[];
  readonly causeText: string;
  readonly nextAction: string;
  readonly details: { parameterNames: string[] };

  constructor(code: AshibaParameterError['code'], parameterNames: string[]) {
    const label = code === 'ASHIBA_MISSING_PARAMETER' ? 'Missing' : 'Unused';
    super(`${label} SQL parameter${parameterNames.length === 1 ? '' : 's'}: ${parameterNames.join(', ')}`);
    this.name = 'AshibaParameterError';
    this.code = code;
    this.parameterNames = parameterNames;
    this.causeText = code === 'ASHIBA_MISSING_PARAMETER'
      ? 'The provided parameter object does not include every named SQL parameter required by the query model.'
      : 'The provided parameter object includes keys that are not referenced by the query model.';
    this.nextAction = code === 'ASHIBA_MISSING_PARAMETER'
      ? 'Pass values for the listed parameters or regenerate the query contract if the SQL changed.'
      : 'Remove the listed parameters from the call or update the SQL/query contract if they are intended.';
    this.details = { parameterNames };
  }
}

/**
 * Error raised when required query model metadata is missing or stale.
 */
export class AshibaPostgresQueryModelError extends Error {
  readonly code: 'ASHIBA_QUERY_MODEL_STALE' | 'ASHIBA_BINDING_METADATA_REQUIRED';
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: AshibaPostgresQueryModelError['code'], message: string) {
    super(message);
    this.name = 'AshibaPostgresQueryModelError';
    this.code = code;
    this.causeText = code === 'ASHIBA_BINDING_METADATA_REQUIRED'
      ? 'The PostgreSQL adapter is running in metadata-based binding mode, but the query model did not include Postgres binding metadata.'
      : 'The query model metadata was generated from different SQL than the SQL passed to the adapter.';
    this.nextAction = code === 'ASHIBA_BINDING_METADATA_REQUIRED'
      ? 'Run Ashiba model generation for the visible SQL and pass queryModel.bindings.postgres to the adapter.'
      : 'Regenerate the query model from the current visible SQL and ensure the source SQL passed to the adapter is unchanged.';
  }
}

/**
 * Create a thin adapter around a pg-compatible client or pool.
 */
export function createPostgresAdapter(
  client: NodePostgresQueryable,
  options: AshibaPostgresAdapterOptions = {},
): AshibaPostgresAdapter {
  return {
    async execute<Row = unknown>(
      query: AshibaPostgresQuerySource,
      params: Readonly<Record<string, unknown>> = {},
      executeOptions: AshibaPostgresExecuteOptions = {},
    ): Promise<NodePostgresQueryResult<Row>> {
      const sql = query.sql;
      const queryModel = executeOptions.queryModel ?? query.queryModel;
      const metadata = {
        ...query.metadata,
        ...executeOptions.metadata,
        sqlPath: executeOptions.metadata?.sqlPath ?? query.metadata?.sqlPath ?? query.sqlPath,
        dialect: executeOptions.metadata?.dialect ?? query.metadata?.dialect ?? 'postgres',
      };
      const startedAt = Date.now();
      let sourceSql = sql;
      let compiledSql = sql;
      let bound: { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } | undefined;

      try {
        const sortInsertion = getSortInsertion({ ...query, queryModel }, executeOptions);
        bound = bindPostgresParameters({ ...query, queryModel }, params);
        if (sortInsertion) {
          sourceSql = spliceOrderBy(sql, sortInsertion.insertion, sortInsertion.orderBy);
          compiledSql = spliceOrderBy(bound.sql, sortInsertion.compiledInsertion, sortInsertion.orderBy);
          bound = { ...bound, sql: compiledSql };
        } else {
          sourceSql = sql;
          compiledSql = bound.sql;
        }

        options.observer?.emit({
          phase: 'start',
          metadata,
          sourceSql,
          compiledSql,
          orderedNames: bound.orderedNames,
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
        });

        const result = await client.query(bound.sql, bound.values);
        options.observer?.emit({
          phase: 'end',
          metadata,
          sourceSql,
          compiledSql: bound.sql,
          orderedNames: bound.orderedNames,
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
          elapsedMs: Date.now() - startedAt,
          rowCount: result.rowCount ?? result.rows.length,
        });
        return result as NodePostgresQueryResult<Row>;
      } catch (error) {
        options.observer?.emit({
          phase: 'error',
          metadata,
          sourceSql,
          ...(bound
            ? {
              compiledSql: bound.sql,
              orderedNames: bound.orderedNames,
              maskedParams: maskParams(bound.values, options.maskPolicy),
              ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
            }
            : {}),
          elapsedMs: Date.now() - startedAt,
          error: normalizeError(error),
        });
        throw error;
      }
    },
  };
}

function bindPostgresParameters(
  query: AshibaPostgresQuerySource,
  params: Readonly<Record<string, unknown>>,
): { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } {
  const sourceSql = query.sql;
  const precomputed = query.queryModel?.bindings?.postgres;
  if (!precomputed) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_BINDING_METADATA_REQUIRED',
      'PostgreSQL adapter parameter binding requires CLI-generated query model binding metadata.',
    );
  }
  const currentHash = hashSql(sourceSql);
  if (query.queryModel?.analysis.sourceHash !== currentHash || precomputed.sourceHash !== currentHash) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_QUERY_MODEL_STALE',
      'Query model binding metadata was generated from different source SQL.',
    );
  }
  return bindCompiledNamedParameters({
    sql: precomputed.sql,
    orderedNames: [...precomputed.orderedNames],
  }, params);
}

function bindCompiledNamedParameters(
  compiled: { sql: string; orderedNames: readonly string[] },
  params: Readonly<Record<string, unknown>>,
): { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } {
  const uniqueNames = new Set(compiled.orderedNames);
  const missingNames = [...uniqueNames].filter((name) => !Object.prototype.hasOwnProperty.call(params, name));

  if (missingNames.length > 0) {
    throw new AshibaParameterError('ASHIBA_MISSING_PARAMETER', missingNames);
  }

  const unusedNames = Object.keys(params).filter((name) => !uniqueNames.has(name));
  if (unusedNames.length > 0) {
    throw new AshibaParameterError('ASHIBA_UNUSED_PARAMETER', unusedNames);
  }

  return {
    ...compiled,
    values: compiled.orderedNames.map((name) => params[name]),
  };
}

function getSortInsertion(
  query: AshibaPostgresQuerySource,
  options: AshibaPostgresExecuteOptions,
): {
  insertion: { index: number; mode: 'order-by' | 'comma' };
  compiledInsertion: { index: number; mode: 'order-by' | 'comma' };
  orderBy: string;
} | undefined {
  if (!options.sort || options.sort.length === 0) return undefined;
  const sql = query.sql;
  const queryModel = query.queryModel;
  if (!queryModel?.analysis) {
    throw new AshibaSortError(
      'ASHIBA_SORT_QUERY_MODEL_REQUIRED',
      'Safe sort requires a CLI-generated query model analysis.',
    );
  }
  if (
    queryModel.analysis.astParse !== 'ok' ||
    queryModel.analysis.statementKind !== 'select'
  ) {
    throw new AshibaSortError(
      'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL',
      'Safe sort requires a parsed SELECT query model.',
    );
  }
  if (queryModel.analysis.rootQueryShape === 'compound-select') {
    throw new AshibaSortError(
      'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL',
      'Root compound SELECT safe sort is not supported. Wrap the compound query in a subquery and expose stable sortable columns.',
    );
  }
  if (!queryModel.analysis.sourceHash || queryModel.analysis.sourceHash !== hashSql(sql)) {
    throw new AshibaSortError(
      'ASHIBA_SORT_QUERY_MODEL_STALE',
      'Safe sort requires query model metadata generated from the same source SQL.',
    );
  }
  if (!queryModel.analysis.safeSort || queryModel.analysis.safeSort.insertion.status !== 'ready') {
    const reason = queryModel.analysis.safeSort?.insertion.status === 'unresolved'
      ? queryModel.analysis.safeSort.insertion.reason
      : undefined;
    throw new AshibaSortError(
      'ASHIBA_SORT_INSERTION_UNRESOLVED',
      [
        'Safe sort insertion position is unresolved.',
        reason ?? 'Regenerate query model metadata before enabling driver-side ORDER BY rendering.',
      ].join(' '),
    );
  }
  const sortProfile = resolveSortProfile(queryModel.analysis, options.sortProfile);
  if (!sortProfile) {
    throw new AshibaSortError(
      'ASHIBA_EMPTY_SORT_PROFILE',
      'Safe sort requires query model sortable metadata.',
    );
  }

  const orderBy = renderSafeOrderBy(sortProfile, options.sort);
  const compiledIndex = queryModel.bindings?.postgres?.safeSortInsertion?.index;
  if (compiledIndex === undefined) {
    throw new AshibaSortError(
      'ASHIBA_SORT_QUERY_MODEL_STALE',
      'Safe sort with metadata-based parameter binding requires Postgres compiled insertion metadata. Regenerate query model metadata.',
    );
  }
  return {
    insertion: queryModel.analysis.safeSort.insertion,
    compiledInsertion: {
      index: compiledIndex,
      mode: queryModel.analysis.safeSort.insertion.mode,
    },
    orderBy,
  };
}

function resolveSortProfile(
  analysis: AshibaQueryModelAnalysis,
  explicitProfile: AshibaSortProfile | undefined,
): AshibaSortProfile | undefined {
  const queryModelProfile = analysis.safeSort?.sortable;
  if (!queryModelProfile) {
    return undefined;
  }
  if (!explicitProfile) {
    return queryModelProfile;
  }

  const resolved: Record<string, { sql: string; defaultDirection?: 'asc' | 'desc' }> = {};
  for (const [key, queryModelEntry] of Object.entries(queryModelProfile)) {
    const explicitEntry = explicitProfile[key];
    if (explicitEntry && explicitEntry.sql !== queryModelEntry.sql) {
      throw new AshibaSortError(
        'ASHIBA_SORT_PROFILE_OUTSIDE_QUERY_MODEL',
        `Sort profile key ${key} does not match CLI-generated query model sortable metadata.`,
      );
    }
    resolved[key] = {
      sql: queryModelEntry.sql,
      defaultDirection: explicitEntry?.defaultDirection ?? queryModelEntry.defaultDirection,
    };
  }

  return resolved;
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}

function spliceOrderBy(
  sql: string,
  insertion: { index: number; mode: 'order-by' | 'comma' },
  orderBy: string,
): string {
  const prefix = sql.slice(0, insertion.index).trimEnd();
  const suffix = sql.slice(insertion.index);
  const fragment = insertion.mode === 'comma'
    ? `, ${stripOrderByPrefix(orderBy)}`
    : ` ${orderBy}`;
  const separator = suffix.length > 0 && !isWhitespace(suffix[0] ?? '') ? ' ' : '';
  return `${prefix}${fragment}${separator}${suffix}`;
}

function stripOrderByPrefix(value: string): string {
  const prefix = 'order by ';
  return value.toLowerCase().startsWith(prefix) ? value.slice(prefix.length) : value;
}

function isWhitespace(value: string): boolean {
  return value === ' ' || value === '\n' || value === '\r' || value === '\t' || value === '\f';
}
