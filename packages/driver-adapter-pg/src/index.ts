import { createHash, randomUUID } from 'node:crypto';
import {
  type AshibaMaskPolicy,
  type AshibaQueryModelAnalysis,
  type AshibaSortInput,
  type AshibaSortProfile,
  type AshibaSqlExecutionMetadata,
  type AshibaSqlExecutionObserver,
  type AshibaQueryParams,
  type AshibaQueryRow,
  type AshibaTypedQuerySource,
  type FeatureQueryPostgresDialectBinding,
  type PostgresDriverRepresentationProfile,
  AshibaSortError,
  maskParams,
  normalizeError,
  renderSafeOrderBy,
} from '@ashiba-ts/driver-adapter-core';
import { bindNamedParameters, NamedParameterError } from '@ashiba-ts/named-parameters';

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
  /**
   * Representation profile used by the caller-owned pg client. Pass a stable
   * `custom:<id>` value whenever custom node-postgres type parsers are active.
   */
  driverProfile?: PostgresDriverRepresentationProfile;
};

/**
 * CLI-generated query model required by the PostgreSQL adapter.
 */
export type AshibaPostgresQueryModel = {
  analysis: AshibaQueryModelAnalysis;
  bindings?: {
    postgres?: FeatureQueryPostgresDialectBinding;
  };
};

/**
 * SQL text source supplied by the application or build tooling. `sqlPath` is
 * optional provenance; this runtime package never loads the SQL from disk.
 */
export type AshibaPostgresQuerySource<Params extends object = Record<string, unknown>, Row = unknown> = AshibaTypedQuerySource<Params, Row> & {
  sql: string;
  sqlPath?: string;
  queryModel: AshibaPostgresQueryModel;
  metadata?: AshibaSqlExecutionMetadata;
};

/** PostgreSQL query source with a concrete type-only Params/Row contract. */
export type AnyAshibaPostgresQuerySource = AshibaPostgresQuerySource<any, any>;

/**
 * Per-execution metadata and safe sort options for PostgreSQL execution.
 */
export type AshibaPostgresExecuteOptions = {
  metadata?: AshibaSqlExecutionMetadata;
  optionalConditionCompression?: boolean;
  sortProfile?: AshibaSortProfile;
  sort?: readonly AshibaSortInput[];
  /** Reject unused parameter keys; Candidate B leaves this off by default. */
  strictParameterNames?: boolean;
};

/**
 * Optional PostgreSQL adapter convenience interface exposed to application code.
 */
export type AshibaPostgresAdapter = {
  execute<Query extends AnyAshibaPostgresQuerySource>(
    query: Query,
    params: AshibaQueryParams<Query>,
    options?: AshibaPostgresExecuteOptions,
  ): Promise<NodePostgresQueryResult<AshibaQueryRow<Query>>>;
};

/**
 * Ordinary PostgreSQL SQL plus ordered values derived from a reviewed source.
 * This is intentionally a data result, not a runtime query AST or builder.
 */
export type AshibaPostgresCompiledQuery = {
  canonicalSql: string;
  sourceSql: string;
  sql: string;
  orderedNames: readonly string[];
  values: readonly unknown[];
  sourceHash?: string;
  transformations: {
    optionalConditionCompression: boolean;
    safeSortKeys: readonly string[];
  };
};

/**
 * The minimum PostgreSQL runtime result: SQL and values ready for the native
 * driver. Ashiba deliberately does not acquire clients, manage transactions,
 * or call `pg.query` from this boundary.
 */
export type AshibaPostgresPreparedQuery = AshibaPostgresCompiledQuery;

/**
 * Classification result for PostgreSQL errors that may be retried by a
 * caller-owned visible retry boundary.
 */
export type AshibaPostgresRetryClassification = {
  retryable: boolean;
  code?: string;
  reason?: string;
};

/**
 * Adapter-facing error decoration for observer events. Parameter validation and
 * ordering remain owned by `@ashiba-ts/named-parameters`.
 */
export class AshibaParameterError extends NamedParameterError {
  readonly causeText: string;
  readonly nextAction: string;
  readonly details: { parameterNames: readonly string[] };

  constructor(code: NamedParameterError['code'], parameterNames: readonly string[]) {
    super(code, parameterNames);
    this.name = 'AshibaParameterError';
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
  readonly code:
    | 'ASHIBA_QUERY_MODEL_STALE'
    | 'ASHIBA_DRIVER_PROFILE_MISMATCH'
    | 'ASHIBA_BINDING_METADATA_REQUIRED'
    | 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_REQUIRED'
    | 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_UNSUPPORTED_QUERY_MODEL'
    | 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE';
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: AshibaPostgresQueryModelError['code'], message: string) {
    super(message);
    this.name = 'AshibaPostgresQueryModelError';
    this.code = code;
    this.causeText = describeQueryModelErrorCause(code);
    this.nextAction = describeQueryModelErrorNextAction(code);
  }
}

type TextRange = {
  start: number;
  end: number;
};

type TextEdit = TextRange & {
  text: string;
};

const POSTGRES_TRANSIENT_SQLSTATES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '53300', // too_many_connections
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08000', // connection_exception
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08003', // connection_does_not_exist
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '08006', // connection_failure
  '08007', // transaction_resolution_unknown
]);

const POSTGRES_TRANSIENT_NODE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'ENETDOWN',
  'ENETRESET',
  'ENETUNREACH',
  'EHOSTDOWN',
  'EHOSTUNREACH',
]);

/**
 * Create an optional Ashiba convenience adapter around a pg-compatible client or pool.
 */
export function createPostgresAdapter(
  client: NodePostgresQueryable,
  options: AshibaPostgresAdapterOptions = {},
): AshibaPostgresAdapter {
  return {
    async execute<Query extends AnyAshibaPostgresQuerySource>(
      query: Query,
      params: AshibaQueryParams<Query>,
      executeOptions: AshibaPostgresExecuteOptions = {},
    ): Promise<NodePostgresQueryResult<AshibaQueryRow<Query>>> {
      const sql = query.sql;
      const queryModel = query.queryModel;
      const metadata = {
        ...query.metadata,
        ...executeOptions.metadata,
        sqlPath: executeOptions.metadata?.sqlPath ?? query.metadata?.sqlPath ?? query.sqlPath,
        dialect: executeOptions.metadata?.dialect ?? query.metadata?.dialect ?? 'postgres',
      };
      const warnings = buildSqlSourceWarnings(query, metadata);
      const startedAt = Date.now();
      const executionId = randomUUID();
      let sourceSql = sql;
      let compiledSql = sql;
      let bound: { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } | undefined;

      try {
        validateDriverProfile(query, options.driverProfile ?? 'node-postgres-default');
        const compiled = preparePostgresQuery(query, params, {
          ...executeOptions,
          strictParameterNames: executeOptions.strictParameterNames ?? true,
        });
        sourceSql = compiled.sourceSql;
        compiledSql = compiled.sql;
        bound = compiled;

        options.observer?.emit({
          phase: 'start',
          executionId,
          metadata,
          ...(warnings.length > 0 ? { warnings } : {}),
          sourceSql,
          compiledSql,
          orderedNames: bound.orderedNames,
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
        });

        const result = await client.query(bound.sql, bound.values);
        options.observer?.emit({
          phase: 'end',
          executionId,
          metadata,
          ...(warnings.length > 0 ? { warnings } : {}),
          sourceSql,
          compiledSql: bound.sql,
          orderedNames: bound.orderedNames,
          maskedParams: maskParams(bound.values, options.maskPolicy),
          ...(options.includeUnmaskedParamsInEvents ? { params: bound.values } : {}),
          elapsedMs: Date.now() - startedAt,
          rowCount: result.rowCount ?? result.rows.length,
        });
        return result as NodePostgresQueryResult<AshibaQueryRow<Query>>;
      } catch (error) {
        options.observer?.emit({
          phase: 'error',
          executionId,
          metadata,
          ...(warnings.length > 0 ? { warnings } : {}),
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

/**
 * Compile one application-supplied SQL text query into normal PostgreSQL SQL and ordered values
 * without executing it. The returned SQL is suitable for logging, debugging,
 * EXPLAIN tooling, or a generic query executor.
 */
export function preparePostgresQuery<Query extends AnyAshibaPostgresQuerySource>(
  query: Query,
  params: AshibaQueryParams<Query>,
  options: AshibaPostgresExecuteOptions = {},
): AshibaPostgresPreparedQuery {
  const normalizedParams = Object.fromEntries(Object.entries(params));
  const sortInsertion = getSortInsertion(query, options);
  const prepared = preparePostgresExecution(query, normalizedParams, options);
  let sourceSql = prepared.sourceSql;
  let sql = prepared.sql;
  if (sortInsertion) {
    const sourceInsertion = adjustInsertionForRewriteRanges(sortInsertion.insertion, prepared.sourceRewriteRanges);
    sourceSql = spliceOrderBy(prepared.sourceSql, sourceInsertion, sortInsertion.orderBy);
    const compressedCompiledInsertion = adjustInsertionForRewriteRanges(
      sortInsertion.compiledInsertion,
      prepared.compiledRewriteRanges,
    );
    const compiledInsertion = adjustInsertionForRewriteRanges(
      compressedCompiledInsertion,
      prepared.compiledRenumberRanges,
    );
    sql = spliceOrderBy(prepared.sql, compiledInsertion, sortInsertion.orderBy);
  }
  return {
    canonicalSql: normalizeSqlSource(query.sql),
    sourceSql,
    sql,
    orderedNames: prepared.orderedNames,
    values: prepared.values,
    sourceHash: query.queryModel.analysis.sourceHash,
    transformations: {
      optionalConditionCompression: options.optionalConditionCompression === true,
      safeSortKeys: (options.sort ?? []).map((entry) => entry.key),
    },
  };
}

/**
 * @deprecated Prefer `preparePostgresQuery(query, params, options)` and call
 * the application-owned native PostgreSQL client with `prepared.sql` and
 * `prepared.values`. This compatibility name will remain until the next
 * planned pre-1.0 surface review.
 */
export function compilePostgresQuery<Query extends AnyAshibaPostgresQuerySource>(
  query: Query,
  params: AshibaQueryParams<Query>,
  options: AshibaPostgresExecuteOptions = {},
): AshibaPostgresPreparedQuery {
  return preparePostgresQuery(query, params, {
    ...options,
    strictParameterNames: options.strictParameterNames ?? true,
  });
}

/**
 * Classify PostgreSQL/pg errors that can be candidates for an explicit retry policy.
 *
 * This does not mean the operation is safe to retry. Application code still
 * owns transaction boundaries, idempotency, and SAGA/compensation decisions.
 */
export function classifyPostgresTransientError(error: unknown): AshibaPostgresRetryClassification {
  const code = getErrorCode(error);
  if (!code) {
    return { retryable: false };
  }
  if (POSTGRES_TRANSIENT_SQLSTATES.has(code)) {
    return {
      retryable: true,
      code,
      reason: `PostgreSQL reported transient SQLSTATE ${code}.`,
    };
  }
  if (POSTGRES_TRANSIENT_NODE_ERROR_CODES.has(code)) {
    return {
      retryable: true,
      code,
      reason: `Node PostgreSQL driver reported transient connection error ${code}.`,
    };
  }
  return { retryable: false, code };
}

/**
 * Return true when the error is a PostgreSQL transient failure candidate.
 */
export function isPostgresTransientError(error: unknown): boolean {
  return classifyPostgresTransientError(error).retryable;
}

function buildSqlSourceWarnings(
  query: AnyAshibaPostgresQuerySource,
  metadata: AshibaSqlExecutionMetadata,
): readonly { code: string; message: string; nextAction?: string }[] {
  if (query.sqlPath || metadata.sqlPath || metadata.sqlFile) {
    return [];
  }

  return [{
    code: 'ASHIBA_STRING_SQL_SOURCE',
    message: 'SQL execution did not include optional SQL provenance metadata.',
    nextAction: 'Supply sqlPath or sqlFile metadata when application logging needs to point reviewers to the SQL owner.',
  }];
}

function preparePostgresExecution(
  query: AnyAshibaPostgresQuerySource,
  params: Readonly<Record<string, unknown>>,
  options: AshibaPostgresExecuteOptions,
): {
  sourceSql: string;
  sql: string;
  orderedNames: readonly string[];
  values: readonly unknown[];
  sourceRewriteRanges: readonly TextEdit[];
  compiledRewriteRanges: readonly TextEdit[];
  compiledRenumberRanges: readonly TextEdit[];
} {
  const sourceSql = normalizeSqlSource(query.sql);
  const normalizedQuery = query.sql === sourceSql ? query : { ...query, sql: sourceSql };
  const precomputed = validatePostgresBindingMetadata(normalizedQuery);
  const compression = options.optionalConditionCompression === true
    ? applyOptionalConditionCompression(normalizedQuery, precomputed, params)
    : undefined;
  const compiled = compression
    ? {
      sql: compression.compiledSql,
      orderedNames: compression.orderedNames,
    }
    : {
      sql: precomputed.sql,
      orderedNames: [...precomputed.orderedNames],
    };
  const bound = bindCompiledNamedParameters(
    compiled,
    params,
    compression?.compressedParameterNames,
    options.strictParameterNames === true,
  );
  return {
    sourceSql: compression?.sourceSql ?? sourceSql,
    ...bound,
    sourceRewriteRanges: compression?.sourceRewriteRanges ?? [],
    compiledRewriteRanges: compression?.compiledRewriteRanges ?? [],
    compiledRenumberRanges: compression?.compiledRenumberRanges ?? [],
  };
}

function validatePostgresBindingMetadata(
  query: AnyAshibaPostgresQuerySource,
): NonNullable<NonNullable<AshibaPostgresQueryModel['bindings']>['postgres']> {
  const precomputed = query.queryModel?.bindings?.postgres;
  if (!precomputed) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_BINDING_METADATA_REQUIRED',
      'PostgreSQL adapter parameter binding requires CLI-generated query model binding metadata.',
    );
  }
  const currentHash = hashSql(query.sql);
  if (query.queryModel?.analysis.sourceHash !== currentHash || precomputed.sourceHash !== currentHash) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_QUERY_MODEL_STALE',
      'Query model binding metadata was generated from different source SQL.',
    );
  }
  if (precomputed.contract && precomputed.contract.sourceHash !== currentHash) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_QUERY_MODEL_STALE',
      'PostgreSQL-derived query contract was generated from different source SQL.',
    );
  }
  return precomputed;
}

function validateDriverProfile(
  query: AnyAshibaPostgresQuerySource,
  actualProfile: PostgresDriverRepresentationProfile,
): void {
  const expectedProfile = query.queryModel.bindings?.postgres?.contract?.driver.profile;
  if (!expectedProfile || expectedProfile === actualProfile) return;
  throw new AshibaPostgresQueryModelError(
    'ASHIBA_DRIVER_PROFILE_MISMATCH',
    `PostgreSQL query contract expects driver profile ${expectedProfile}, but the adapter uses ${actualProfile}.`,
  );
}

function bindCompiledNamedParameters(
  compiled: { sql: string; orderedNames: readonly string[] },
  params: Readonly<Record<string, unknown>>,
  allowedUnusedNames: ReadonlySet<string> = new Set(),
  strictParameterNames = false,
): { sql: string; orderedNames: readonly string[]; values: readonly unknown[] } {
  try {
    return bindNamedParameters(compiled, params, {
      strict: strictParameterNames,
      allowedUnusedNames,
    });
  } catch (error) {
    if (error instanceof NamedParameterError) {
      throw new AshibaParameterError(error.code, error.parameterNames);
    }
    throw error;
  }
}

function applyOptionalConditionCompression(
  query: AnyAshibaPostgresQuerySource,
  precomputed: NonNullable<NonNullable<AshibaPostgresQueryModel['bindings']>['postgres']>,
  params: Readonly<Record<string, unknown>>,
): {
  sourceSql: string;
  compiledSql: string;
  orderedNames: readonly string[];
  compressedParameterNames: ReadonlySet<string>;
  sourceRewriteRanges: readonly TextEdit[];
  compiledRewriteRanges: readonly TextEdit[];
  compiledRenumberRanges: readonly TextEdit[];
} {
  const analysis = query.queryModel?.analysis.optionalConditionCompression;
  const binding = precomputed.optionalConditionCompression;
  if (!analysis || !binding) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_REQUIRED',
      'Optional condition compression requires CLI-generated query model metadata.',
    );
  }
  if (query.queryModel?.analysis.astParse !== 'ok') {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_UNSUPPORTED_QUERY_MODEL',
      'Optional condition compression requires successfully parsed query model metadata.',
    );
  }
  if (analysis.branches.length !== binding.branches.length) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
      'Optional condition compression metadata does not match Postgres binding metadata.',
    );
  }

  const activeBranches = analysis.branches
    .map((branch, index) => ({ source: branch, compiled: binding.branches[index], index }))
    .filter((branch): branch is {
      source: NonNullable<typeof analysis>['branches'][number];
      compiled: NonNullable<typeof binding>['branches'][number];
      index: number;
    } => {
      if (!branch.compiled || branch.source.parameterName !== branch.compiled.parameterName) {
        throw new AshibaPostgresQueryModelError(
          'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
          'Optional condition compression metadata has mismatched branch order.',
        );
      }
      return Object.prototype.hasOwnProperty.call(params, branch.source.parameterName)
        && params[branch.source.parameterName] == null;
    });
  const activeBranchIndexes = new Set(activeBranches.map((branch) => branch.index));
  const presentBranches = analysis.branches
    .map((branch, index) => ({ source: branch, compiled: binding.branches[index] }))
    .filter((branch): branch is {
      source: NonNullable<typeof analysis>['branches'][number];
      compiled: NonNullable<typeof binding>['branches'][number];
    } => {
      if (!branch.compiled || branch.source.parameterName !== branch.compiled.parameterName) {
        throw new AshibaPostgresQueryModelError(
          'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
          'Optional condition compression metadata has mismatched branch order.',
        );
      }
      return Object.prototype.hasOwnProperty.call(params, branch.source.parameterName)
        && params[branch.source.parameterName] != null;
    });

  if (activeBranches.length === 0 && presentBranches.length === 0) {
    return {
      sourceSql: query.sql,
      compiledSql: precomputed.sql,
      orderedNames: [...precomputed.orderedNames],
      compressedParameterNames: new Set(),
      sourceRewriteRanges: [],
      compiledRewriteRanges: [],
      compiledRenumberRanges: [],
    };
  }

  const activeSourceGroups = (analysis.groups ?? [])
    .filter((group) => group.branchIndexes.every((index) => activeBranchIndexes.has(index)));
  const activeCompiledGroups = (binding.groups ?? [])
    .filter((group) => group.branchIndexes.every((index) => activeBranchIndexes.has(index)));
  const activeSourcePrefixGroups = selectActiveLeadingPrefixGroups(analysis.groups ?? [], activeBranchIndexes);
  const activeCompiledPrefixGroups = selectActiveLeadingPrefixGroups(binding.groups ?? [], activeBranchIndexes);
  const groupedBranchIndexes = new Set([
    ...activeSourceGroups.flatMap((group) => [...group.branchIndexes]),
    ...activeSourcePrefixGroups.flatMap((group) => [...group.branchIndexes]),
  ]);
  const activeSourceGroupRanges = [
    ...activeSourceGroups.map((group) => group.removalRange),
    ...activeSourcePrefixGroups.map((group) => group.removalRange),
  ];
  const activeCompiledGroupRanges = [
    ...activeCompiledGroups.map((group) => group.removalRange),
    ...activeCompiledPrefixGroups.map((group) => group.removalRange),
  ];
  const sourceRemovalRanges = mergeTextRanges([
    ...activeSourceGroupRanges,
    ...activeBranches.filter((branch) => !groupedBranchIndexes.has(branch.index)).map((branch) => branch.source.removalRange),
  ]);
  const compiledRemovalRanges = mergeTextRanges([
    ...activeCompiledGroupRanges,
    ...activeBranches.filter((branch) => !groupedBranchIndexes.has(branch.index)).map((branch) => branch.compiled.removalRange),
  ]);
  for (const branch of activeBranches) {
    assertRangeTextMatches(query.sql, branch.source.sourceRange, 'source SQL source range');
    assertRangeTextMatches(query.sql, branch.source.removalRange, 'source SQL removal range');
    assertRangeTextMatches(precomputed.sql, branch.compiled.removalRange, 'compiled SQL removal range');
  }
  for (const branch of presentBranches) {
    assertRangeTextMatches(query.sql, branch.source.sourceRange, 'source SQL source range');
  }
  for (const range of activeSourceGroupRanges) {
    assertRangeTextMatches(query.sql, range, 'source SQL empty group removal range');
  }
  for (const range of activeCompiledGroupRanges) {
    assertRangeTextMatches(precomputed.sql, range, 'compiled SQL empty group removal range');
  }

  const sourceRewriteRanges = normalizeTextEdits([
    ...sourceRemovalRanges.map((range) => ({ ...range, text: '' })),
    ...presentBranches.map((branch) => branch.source.presentReplacement),
  ]);
  const compiledRewriteRanges = normalizeTextEdits([
    ...compiledRemovalRanges.map((range) => ({ ...range, text: '' })),
    ...presentBranches.map((branch) => branch.compiled.presentReplacement),
  ]);
  const sourceSql = rewriteTextRanges(query.sql, sourceRewriteRanges);
  const compressedCompiledSql = rewriteTextRanges(precomputed.sql, compiledRewriteRanges);
  const renumbered = renumberPostgresPlaceholders(compressedCompiledSql, precomputed.orderedNames);

  return {
    sourceSql,
    compiledSql: renumbered.sql,
    orderedNames: renumbered.orderedNames,
    compressedParameterNames: new Set(activeBranches.map((branch) => branch.source.parameterName)),
    sourceRewriteRanges,
    compiledRewriteRanges,
    compiledRenumberRanges: renumbered.rewriteRanges,
  };
}

function selectActiveLeadingPrefixGroups<T extends {
  branchIndexes: readonly number[];
  removalRange: TextRange & { text?: string };
  leadingPrefixes?: readonly {
    branchIndexes: readonly number[];
    removalRange: TextRange & { text?: string };
  }[];
}>(
  groups: readonly T[],
  activeBranchIndexes: ReadonlySet<number>,
): Array<{ branchIndexes: readonly number[]; removalRange: TextRange & { text?: string } }> {
  const selected: Array<{ branchIndexes: readonly number[]; removalRange: TextRange & { text?: string } }> = [];
  for (const group of groups) {
    if (group.branchIndexes.every((index) => activeBranchIndexes.has(index))) {
      continue;
    }
    const prefixes = [...(group.leadingPrefixes ?? [])]
      .filter((prefix) => prefix.branchIndexes.every((index) => activeBranchIndexes.has(index)))
      .sort((left, right) => right.branchIndexes.length - left.branchIndexes.length);
    const prefix = prefixes[0];
    if (prefix) {
      selected.push(prefix);
    }
  }
  return selected;
}

function assertRangeTextMatches(sql: string, range: TextRange & { text?: string }, label: string): void {
  if (range.text === undefined) {
    return;
  }
  if (range.start < 0 || range.end < range.start || range.end > sql.length || sql.slice(range.start, range.end) !== range.text) {
    throw new AshibaPostgresQueryModelError(
      'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
      `Optional condition compression metadata has stale ${label} text.`,
    );
  }
}

function removeTextRanges(sql: string, ranges: readonly TextRange[]): string {
  return rewriteTextRanges(sql, ranges.map((range) => ({ ...range, text: '' })));
}

function rewriteTextRanges(sql: string, ranges: readonly TextEdit[]): string {
  let output = sql;
  for (const range of normalizeTextEdits(ranges).sort((left, right) => right.start - left.start)) {
    if (range.start < 0 || range.end < range.start || range.end > sql.length) {
      throw new AshibaPostgresQueryModelError(
        'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
        'Optional condition compression metadata contains an invalid removal range.',
      );
    }
    output = `${output.slice(0, range.start)}${range.text}${output.slice(range.end)}`;
  }
  return output;
}

function normalizeTextEdits(ranges: readonly TextEdit[]): TextEdit[] {
  return ranges
    .map((range) => ({ start: range.start, end: range.end, text: range.text }))
    .sort((left, right) => left.start - right.start);
}

function mergeTextRanges(ranges: readonly TextRange[]): TextRange[] {
  const sorted = normalizeRanges(ranges);
  const merged: TextRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    previous.end = Math.max(previous.end, range.end);
  }
  return merged;
}

function normalizeRanges(ranges: readonly TextRange[]): TextRange[] {
  return ranges
    .map((range) => ({ start: range.start, end: range.end }))
    .sort((left, right) => left.start - right.start);
}

function adjustInsertionForRewriteRanges<T extends { index: number; end?: number; mode: 'order-by' | 'prepend-comma' | 'comma' | 'replace' }>(
  insertion: T,
  ranges: readonly TextEdit[],
): T {
  let adjustedIndex = insertion.index;
  let adjustedEnd = insertion.end;
  for (const range of normalizeTextEdits(ranges)) {
    if (
      (insertion.index > range.start && insertion.index < range.end)
      || (insertion.end !== undefined && range.start < insertion.end && range.end > insertion.index)
    ) {
      throw new AshibaPostgresQueryModelError(
        'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
        'Optional condition compression rewrote the safe-sort source range.',
      );
    }
    if (insertion.index >= range.end) {
      adjustedIndex += range.text.length - (range.end - range.start);
    }
    if (adjustedEnd !== undefined && insertion.end !== undefined && insertion.end >= range.end) {
      adjustedEnd += range.text.length - (range.end - range.start);
    }
  }
  return {
    ...insertion,
    index: adjustedIndex,
    ...(adjustedEnd !== undefined ? { end: adjustedEnd } : {}),
  };
}

function renumberPostgresPlaceholders(
  sql: string,
  originalOrderedNames: readonly string[],
): { sql: string; orderedNames: readonly string[]; rewriteRanges: readonly TextEdit[] } {
  let output = '';
  const orderedNames: string[] = [];
  const rewriteRanges: TextEdit[] = [];
  let cursor = 0;
  let quote: '"' | "'" | undefined;
  let quoteBackslashEscapes = false;
  let dollarTag: string | undefined;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = undefined;
      }
      continue;
    }
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (quoteBackslashEscapes && char === '\\' && next) {
        index += 1;
      } else if (char === quote) {
        if (next === quote) {
          index += 1;
        } else {
          quoteBackslashEscapes = false;
          quote = undefined;
        }
      }
      continue;
    }
    if (char === '-' && next === '-') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    const dollarQuote = sql.slice(index).match(/^(\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$)/);
    if (dollarQuote) {
      dollarTag = dollarQuote[0];
      index += dollarTag.length - 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      quoteBackslashEscapes = char === "'" && isPostgresEscapeStringStart(sql, index);
      continue;
    }
    if (char === '$' && isDigit(next)) {
      let end = index + 2;
      while (isDigit(sql[end] ?? '')) end += 1;
      const originalIndex = Number(sql.slice(index + 1, end));
      const name = originalOrderedNames[originalIndex - 1];
      if (!name) {
        throw new AshibaPostgresQueryModelError(
          'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE',
          `Optional condition compression found unknown compiled placeholder $${originalIndex}.`,
        );
      }
      output += sql.slice(cursor, index);
      orderedNames.push(name);
      const replacement = `$${orderedNames.length}`;
      output += replacement;
      rewriteRanges.push({
        start: index,
        end,
        text: replacement,
      });
      cursor = end;
      index = end - 1;
    }
  }

  output += sql.slice(cursor);
  return { sql: output, orderedNames, rewriteRanges };
}

function getSortInsertion(
  query: AnyAshibaPostgresQuerySource,
  options: AshibaPostgresExecuteOptions,
): {
  insertion: { index: number; end?: number; mode: 'order-by' | 'prepend-comma' | 'comma' | 'replace' };
  compiledInsertion: { index: number; end?: number; mode: 'order-by' | 'prepend-comma' | 'comma' | 'replace' };
  orderBy: string;
} | undefined {
  if (!options.sort || options.sort.length === 0) return undefined;
  const sql = normalizeSqlSource(query.sql);
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
  const compiledEnd = queryModel.bindings?.postgres?.safeSortInsertion?.end;
  if (queryModel.analysis.safeSort.insertion.mode === 'replace' && compiledEnd === undefined) {
    throw new AshibaSortError(
      'ASHIBA_SORT_QUERY_MODEL_STALE',
      'Safe sort replacement requires a compiled ORDER BY range. Regenerate query model metadata.',
    );
  }
  return {
    insertion: queryModel.analysis.safeSort.insertion,
    compiledInsertion: {
      index: compiledIndex,
      ...(compiledEnd !== undefined ? { end: compiledEnd } : {}),
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

  const resolved: Record<string, { sql: string; defaultDirection?: 'asc' | 'desc'; allowedDirections?: readonly ('asc' | 'desc')[] }> = {};
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
      allowedDirections: queryModelEntry.allowedDirections,
    };
  }

  return resolved;
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(normalizeSqlSource(sql)).digest('hex')}`;
}

function normalizeSqlSource(sql: string): string {
  return sql.replace(/\r\n?/g, '\n');
}

function describeQueryModelErrorCause(code: AshibaPostgresQueryModelError['code']): string {
  switch (code) {
    case 'ASHIBA_BINDING_METADATA_REQUIRED':
      return 'The PostgreSQL adapter is running in metadata-based binding mode, but the query model did not include Postgres binding metadata.';
    case 'ASHIBA_QUERY_MODEL_STALE':
      return 'The query model metadata was generated from different SQL than the SQL passed to the adapter.';
    case 'ASHIBA_DRIVER_PROFILE_MISMATCH':
      return 'The generated result representation assumes a different node-postgres type-parser profile than the caller-owned client declares.';
    case 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_REQUIRED':
      return 'Optional condition compression was requested, but the query model does not include compression metadata generated by the CLI.';
    case 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_UNSUPPORTED_QUERY_MODEL':
      return 'Optional condition compression was requested, but the query model does not contain successful development-time SQL analysis.';
    case 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE':
      return 'Optional condition compression metadata does not match the SQL or dialect binding metadata being executed.';
  }
}

function describeQueryModelErrorNextAction(code: AshibaPostgresQueryModelError['code']): string {
  switch (code) {
    case 'ASHIBA_BINDING_METADATA_REQUIRED':
      return 'Run Ashiba model generation for the visible SQL and pass queryModel.bindings.postgres to the adapter.';
    case 'ASHIBA_QUERY_MODEL_STALE':
      return 'Regenerate the query model from the current visible SQL and ensure the source SQL passed to the adapter is unchanged.';
    case 'ASHIBA_DRIVER_PROFILE_MISMATCH':
      return 'Use the node-postgres default parsers, regenerate the contract for the declared custom profile, or pass the matching custom:<id> adapter option. Ashiba does not configure driver parsers.';
    case 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_REQUIRED':
      return 'Regenerate the query model with optional condition compression metadata, or disable optionalConditionCompression for this execution.';
    case 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_UNSUPPORTED_QUERY_MODEL':
      return 'Fix the SQL shape or parser support, then regenerate the query model before enabling optionalConditionCompression.';
    case 'ASHIBA_OPTIONAL_CONDITION_COMPRESSION_METADATA_STALE':
      return 'Regenerate the query model from the current visible SQL and keep source SQL, binding metadata, and compression metadata together.';
  }
}

function spliceOrderBy(
  sql: string,
  insertion: { index: number; end?: number; mode: 'order-by' | 'prepend-comma' | 'comma' | 'replace' },
  orderBy: string,
): string {
  if (insertion.mode === 'replace') {
    if (insertion.end === undefined || insertion.end < insertion.index) {
      throw new AshibaSortError(
        'ASHIBA_SORT_QUERY_MODEL_STALE',
        'Safe sort replacement range is missing or invalid.',
      );
    }
    const replaced = sql.slice(insertion.index, insertion.end);
    const trailingWhitespace = replaced.match(/\s*$/)?.[0] ?? '';
    const suffix = sql.slice(insertion.end);
    const separator = trailingWhitespace || (suffix.length > 0 && !isWhitespace(suffix[0] ?? '') ? ' ' : '');
    return `${sql.slice(0, insertion.index)}${stripOrderByPrefix(orderBy)}${separator}${suffix}`;
  }
  if (insertion.mode === 'prepend-comma') {
    const prefix = sql.slice(0, insertion.index).trimEnd();
    const suffix = sql.slice(insertion.index).trimStart();
    return `${prefix} ${stripOrderByPrefix(orderBy)}, ${suffix}`;
  }
  const prefix = sql.slice(0, insertion.index).trimEnd();
  const suffix = sql.slice(insertion.index);
  const fragment = insertion.mode === 'comma'
    ? `, ${stripOrderByPrefix(orderBy)}`
    : ` ${orderBy}`;
  const separator = suffix.length > 0 && !isWhitespace(suffix[0] ?? '') ? ' ' : '';
  return `${prefix}${fragment}${separator}${suffix}`;
}

function stripOrderByPrefix(value: string): string {
  return value.trimStart().replace(/^order\s+by\s+/i, '');
}

function isWhitespace(value: string): boolean {
  return value === ' ' || value === '\n' || value === '\r' || value === '\t' || value === '\f';
}

function isDigit(value: string): boolean {
  return value >= '0' && value <= '9';
}

function isPostgresEscapeStringStart(sql: string, quoteIndex: number): boolean {
  const marker = sql[quoteIndex - 1] ?? '';
  if (marker !== 'E' && marker !== 'e') {
    return false;
  }
  const beforeMarker = sql[quoteIndex - 2] ?? '';
  return !/[A-Za-z0-9_$]/.test(beforeMarker);
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
