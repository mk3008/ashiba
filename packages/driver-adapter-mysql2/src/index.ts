import { createHash } from 'node:crypto';
import {
  type AshibaMaskPolicy,
  type AshibaQueryModelAnalysis,
  type AshibaSqlExecutionMetadata,
  type AshibaSqlExecutionObserver,
  maskParams,
  normalizeError,
} from '@ashiba-ts/driver-adapter-core';

/**
 * Minimal mysql2-compatible result consumed by the adapter.
 */
export type Mysql2Rows<Row = unknown> =
  | Row[]
  | {
    affectedRows?: number;
    changedRows?: number;
  };

/**
 * Minimal mysql2-compatible result consumed by the adapter.
 */
export type Mysql2QueryResult<Row = unknown> = [Mysql2Rows<Row>, unknown];

/**
 * Minimal mysql2-compatible client or pool contract.
 */
export type Mysql2Queryable<Row = unknown> = {
  execute(sql: string, values: readonly unknown[]): Promise<Mysql2QueryResult<Row>>;
};

/**
 * Adapter-level options for execution observation and parameter masking.
 */
export type AshibaMysql2AdapterOptions = {
  observer?: AshibaSqlExecutionObserver;
  maskPolicy?: AshibaMaskPolicy;
  includeUnmaskedParamsInEvents?: boolean;
};

/**
 * CLI-generated query model required by the mysql2 adapter.
 */
export type AshibaMysql2QueryModel = {
  analysis: AshibaQueryModelAnalysis;
  bindings?: {
    mysql2?: {
      sourceHash?: string;
      sql: string;
      orderedNames: readonly string[];
    };
  };
};

/**
 * File-backed SQL query source generated or loaded from a reviewed SQL file.
 */
export type AshibaMysql2QuerySource = {
  sql: string;
  sqlPath: string;
  queryModel: AshibaMysql2QueryModel;
  metadata?: AshibaSqlExecutionMetadata;
};

/**
 * Thin mysql2 adapter interface exposed to application code.
 */
export type AshibaMysql2Adapter = {
  execute<Row = unknown>(
    query: AshibaMysql2QuerySource,
    params?: Readonly<Record<string, unknown>>,
  ): Promise<{ rows: Row[]; fields: unknown }>;
};

/**
 * Error raised when provided named parameters do not match query model metadata.
 */
export class AshibaMysql2ParameterError extends Error {
  readonly code: 'ASHIBA_MISSING_PARAMETER' | 'ASHIBA_UNUSED_PARAMETER';
  readonly parameterNames: string[];
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: AshibaMysql2ParameterError['code'], parameterNames: string[]) {
    const label = code === 'ASHIBA_MISSING_PARAMETER' ? 'Missing' : 'Unused';
    super(`${label} SQL parameter${parameterNames.length === 1 ? '' : 's'}: ${parameterNames.join(', ')}`);
    this.name = 'AshibaMysql2ParameterError';
    this.code = code;
    this.parameterNames = parameterNames;
    this.causeText = code === 'ASHIBA_MISSING_PARAMETER'
      ? 'The provided parameter object does not include every named SQL parameter required by the query model.'
      : 'The provided parameter object includes keys that are not referenced by the query model.';
    this.nextAction = code === 'ASHIBA_MISSING_PARAMETER'
      ? 'Pass values for the listed parameters or regenerate the query contract if the SQL changed.'
      : 'Remove the listed parameters from the call or update the SQL/query contract if they are intended.';
  }
}

/**
 * Error raised when required query model metadata is missing or stale.
 */
export class AshibaMysql2QueryModelError extends Error {
  readonly code: 'ASHIBA_QUERY_MODEL_STALE' | 'ASHIBA_BINDING_METADATA_REQUIRED';
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: AshibaMysql2QueryModelError['code'], message: string) {
    super(message);
    this.name = 'AshibaMysql2QueryModelError';
    this.code = code;
    this.causeText = code === 'ASHIBA_QUERY_MODEL_STALE'
      ? 'The query model metadata does not match the SQL being executed.'
      : 'mysql2 execution requires CLI-generated binding metadata so the adapter does not parse SQL at runtime.';
    this.nextAction = code === 'ASHIBA_QUERY_MODEL_STALE'
      ? 'Regenerate query model metadata from the current visible SQL.'
      : 'Run model generation for the visible SQL and pass the resulting query model to the mysql2 adapter.';
  }
}

/**
 * Create a thin adapter around a mysql2-compatible client or pool.
 */
export function createMysql2Adapter(
  client: Mysql2Queryable,
  options: AshibaMysql2AdapterOptions = {},
): AshibaMysql2Adapter {
  return {
    async execute<Row = unknown>(
      query: AshibaMysql2QuerySource,
      params: Readonly<Record<string, unknown>> = {},
    ): Promise<{ rows: Row[]; fields: unknown }> {
      const metadata = { ...query.metadata, sqlPath: query.metadata?.sqlPath ?? query.sqlPath, dialect: 'mysql' };
      const startedAt = Date.now();
      let bound: { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } | undefined;

      try {
        bound = prepareMysql2Execution(query, params);
        options.observer?.emit({
          phase: 'start',
          metadata,
          sourceSql: query.sql,
          compiledSql: bound.sql,
          orderedNames: bound.orderedNames,
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
        });

        const [rows, fields] = await client.execute(bound.sql, bound.values);
        options.observer?.emit({
          phase: 'end',
          metadata,
          sourceSql: query.sql,
          compiledSql: bound.sql,
          orderedNames: bound.orderedNames,
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
          elapsedMs: Date.now() - startedAt,
          rowCount: getMysql2RowCount(rows),
        });
        return { rows: Array.isArray(rows) ? rows as Row[] : [], fields };
      } catch (error) {
        options.observer?.emit({
          phase: 'error',
          metadata,
          sourceSql: query.sql,
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

function getMysql2RowCount(rows: Mysql2Rows): number | undefined {
  if (Array.isArray(rows)) return rows.length;
  return rows.affectedRows ?? rows.changedRows;
}

function prepareMysql2Execution(
  query: AshibaMysql2QuerySource,
  params: Readonly<Record<string, unknown>>,
): { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } {
  const binding = query.queryModel.bindings?.mysql2;
  if (!binding) {
    throw new AshibaMysql2QueryModelError(
      'ASHIBA_BINDING_METADATA_REQUIRED',
      'mysql2 adapter parameter binding requires CLI-generated query model binding metadata.',
    );
  }
  const currentHash = hashSql(query.sql);
  if (query.queryModel.analysis.sourceHash !== currentHash || binding.sourceHash !== currentHash) {
    throw new AshibaMysql2QueryModelError(
      'ASHIBA_QUERY_MODEL_STALE',
      'Query model binding metadata was generated from different source SQL.',
    );
  }

  return bindCompiledNamedParameters(binding, params);
}

function bindCompiledNamedParameters(
  compiled: { sql: string; orderedNames: readonly string[] },
  params: Readonly<Record<string, unknown>>,
): { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } {
  const uniqueNames = new Set(compiled.orderedNames);
  const missingNames = [...uniqueNames].filter((name) => !Object.prototype.hasOwnProperty.call(params, name));
  if (missingNames.length > 0) {
    throw new AshibaMysql2ParameterError('ASHIBA_MISSING_PARAMETER', missingNames);
  }

  const unusedNames = Object.keys(params).filter((name) => !uniqueNames.has(name));
  if (unusedNames.length > 0) {
    throw new AshibaMysql2ParameterError('ASHIBA_UNUSED_PARAMETER', unusedNames);
  }

  return {
    ...compiled,
    values: compiled.orderedNames.map((name) => params[name]),
  };
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}
