import { createHash } from 'node:crypto';
import {
  type AshibaMaskPolicy,
  type AshibaQueryModelAnalysis,
  type AshibaSqlExecutionMetadata,
  type AshibaSqlExecutionObserver,
  type FeatureQueryDialectBinding,
  maskParams,
  normalizeError,
} from '@ashiba-ts/driver-adapter-core';
import { bindNamedParameters, bindingParameterNames, NamedParameterError, type ParameterBinding } from '@ashiba-ts/named-parameters';

/**
 * Minimal mssql-compatible query result consumed by the adapter.
 */
export type MssqlQueryResult<Row = unknown> = {
  recordset?: Row[];
  rowsAffected?: number[];
};

/**
 * Minimal mssql-compatible request contract.
 */
export type MssqlRequest<Row = unknown> = {
  input(name: string, value: unknown): MssqlRequest<Row>;
  query(sql: string): Promise<MssqlQueryResult<Row>>;
};

/**
 * Factory that creates a fresh mssql Request for one execution.
 */
export type MssqlRequestFactory = {
  request<Row = unknown>(): MssqlRequest<Row>;
};

/**
 * Adapter-level options for execution observation and parameter masking.
 */
export type AshibaMssqlAdapterOptions = {
  observer?: AshibaSqlExecutionObserver;
  maskPolicy?: AshibaMaskPolicy;
  includeUnmaskedParamsInEvents?: boolean;
};

/**
 * CLI-generated query model required by the mssql adapter.
 */
export type AshibaMssqlQueryModel = {
  analysis: AshibaQueryModelAnalysis;
  bindings?: {
    mssql?: FeatureQueryDialectBinding;
  };
};

/**
 * SQL text source supplied by the application or build tooling. `sqlPath` is
 * optional provenance; this runtime package never loads the SQL from disk.
 */
export type AshibaMssqlQuerySource = {
  sql: string;
  sqlPath?: string;
  queryModel: AshibaMssqlQueryModel;
  metadata?: AshibaSqlExecutionMetadata;
};

/**
 * Thin mssql adapter interface exposed to application code.
 */
export type AshibaMssqlAdapter = {
  execute<Row = unknown>(
    query: AshibaMssqlQuerySource,
    params?: Readonly<Record<string, unknown>>,
  ): Promise<MssqlQueryResult<Row>>;
};

/**
 * Error raised when provided named parameters do not match query model metadata.
 */
export class AshibaMssqlParameterError extends NamedParameterError {
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: NamedParameterError['code'], parameterNames: readonly string[]) {
    super(code, parameterNames);
    this.name = 'AshibaMssqlParameterError';
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
export class AshibaMssqlQueryModelError extends Error {
  readonly code: 'ASHIBA_QUERY_MODEL_STALE' | 'ASHIBA_BINDING_METADATA_REQUIRED';
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: AshibaMssqlQueryModelError['code'], message: string) {
    super(message);
    this.name = 'AshibaMssqlQueryModelError';
    this.code = code;
    this.causeText = code === 'ASHIBA_QUERY_MODEL_STALE'
      ? 'The query model metadata does not match the SQL being executed.'
      : 'mssql execution requires CLI-generated binding metadata so the adapter does not parse SQL at runtime.';
    this.nextAction = code === 'ASHIBA_QUERY_MODEL_STALE'
      ? 'Regenerate query model metadata from the current visible SQL.'
      : 'Run model generation for the visible SQL and pass the resulting query model to the mssql adapter.';
  }
}

/**
 * Create an optional Ashiba convenience adapter around an mssql request factory.
 */
export function createMssqlAdapter(
  factory: MssqlRequestFactory,
  options: AshibaMssqlAdapterOptions = {},
): AshibaMssqlAdapter {
  return {
    async execute<Row = unknown>(
      query: AshibaMssqlQuerySource,
      params: Readonly<Record<string, unknown>> = {},
    ): Promise<MssqlQueryResult<Row>> {
      const metadata = { ...query.metadata, sqlPath: query.metadata?.sqlPath ?? query.sqlPath, dialect: 'sqlserver' };
      const startedAt = Date.now();
      let bound: ReturnType<typeof bindNamedParameters> | undefined;

      try {
        bound = prepareMssqlExecution(query, params);
        options.observer?.emit({
          phase: 'start',
          metadata,
          sourceSql: query.sql,
          compiledSql: bound.sql,
          parameterNames: bindingParameterNames(bound),
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
        });

        const request = factory.request<Row>();
        if (bound.style !== 'named') throw new AshibaMssqlQueryModelError('ASHIBA_BINDING_METADATA_REQUIRED', 'mssql execution requires named binding metadata.');
        for (const name of bound.parameterNames) {
          request.input(name, params[name]);
        }
        const result = await request.query(bound.sql);
        options.observer?.emit({
          phase: 'end',
          metadata,
          sourceSql: query.sql,
          compiledSql: bound.sql,
          parameterNames: bindingParameterNames(bound),
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
          elapsedMs: Date.now() - startedAt,
          rowCount: result.recordset?.length ?? result.rowsAffected?.[0],
        });
        return result;
      } catch (error) {
        options.observer?.emit({
          phase: 'error',
          metadata,
          sourceSql: query.sql,
          ...(bound
            ? {
              compiledSql: bound.sql,
              parameterNames: bindingParameterNames(bound),
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

function prepareMssqlExecution(
  query: AshibaMssqlQuerySource,
  params: Readonly<Record<string, unknown>>,
): ReturnType<typeof bindNamedParameters> {
  const binding = query.queryModel.bindings?.mssql;
  if (!binding) {
    throw new AshibaMssqlQueryModelError(
      'ASHIBA_BINDING_METADATA_REQUIRED',
      'mssql adapter parameter binding requires CLI-generated query model binding metadata.',
    );
  }
  const currentHash = hashSql(query.sql);
  if (query.queryModel.analysis.sourceHash !== currentHash || binding.sourceHash !== currentHash) {
    throw new AshibaMssqlQueryModelError(
      'ASHIBA_QUERY_MODEL_STALE',
      'Query model binding metadata was generated from different source SQL.',
    );
  }

  return bindCompiledNamedParameters(binding, params);
}

function bindCompiledNamedParameters(
  compiled: ParameterBinding,
  params: Readonly<Record<string, unknown>>,
): ReturnType<typeof bindNamedParameters> {
  try {
    return bindNamedParameters(compiled, params);
  } catch (error) {
    if (error instanceof NamedParameterError) {
      throw new AshibaMssqlParameterError(error.code, error.parameterNames);
    }
    throw error;
  }
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(normalizeSqlSource(sql)).digest('hex')}`;
}

function normalizeSqlSource(sql: string): string {
  return sql.replace(/\r\n?/g, '\n');
}
