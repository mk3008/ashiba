/**
 * Controls whether parameter values are exposed in driver observer events.
 */
export type AshibaMaskPolicy = 'always' | 'development' | 'never';

/**
 * Stable identity fields that make SQL execution events traceable by applications.
 */
export type AshibaSqlExecutionMetadata = {
  sqlId?: string;
  queryId?: string;
  requestId?: string;
  apiMethod?: string;
  apiPath?: string;
  apiRoute?: string;
  operation?: string;
  filterKeys?: readonly string[];
  sortKeys?: readonly string[];
  queryVariant?: string;
  queryModelSourceHash?: string;
  queryModelStatementKind?: string;
  queryModelRootQueryShape?: string;
  queryModelOptionalConditionCompression?: boolean;
  queryModelSafeSortInsertionStatus?: string;
  sqlFile?: string;
  sqlPath?: string;
  dialect?: string;
};

/**
 * Structured event emitted by thin driver adapters around SQL execution.
 */
export type AshibaSqlExecutionEvent = {
  phase: 'start' | 'end' | 'error';
  executionId?: string;
  metadata?: AshibaSqlExecutionMetadata;
  warnings?: readonly {
    code: string;
    message: string;
    nextAction?: string;
  }[];
  sourceSql?: string;
  compiledSql?: string;
  orderedNames?: readonly string[];
  maskedParams?: readonly unknown[];
  params?: readonly unknown[];
  elapsedMs?: number;
  rowCount?: number;
  error?: {
    name: string;
    message: string;
    code?: string;
    cause?: string;
    nextAction?: string;
  };
};

/**
 * Application-provided observer hook for integrating Ashiba driver events with a logger.
 */
export type AshibaSqlExecutionObserver = {
  emit(event: AshibaSqlExecutionEvent): void;
};

/**
 * Caller-owned decision returned by a visible retry policy.
 */
export type AshibaRetryDecision =
  | boolean
  | {
    retry: boolean;
    reason?: string;
    delayMs?: number;
  };

/**
 * Context passed to retry policy functions after a failed attempt.
 */
export type AshibaRetryContext = {
  attempt: number;
  maxAttempts: number;
  elapsedMs: number;
  error: unknown;
};

/**
 * Structured retry event emitted by retry helpers.
 */
export type AshibaRetryEvent = {
  phase: 'retry' | 'give-up';
  attempt: number;
  maxAttempts: number;
  elapsedMs: number;
  delayMs?: number;
  reason?: string;
  error: {
    name: string;
    message: string;
    code?: string;
    cause?: string;
    nextAction?: string;
  };
};

/**
 * Application-provided observer hook for retry visibility.
 */
export type AshibaRetryObserver = {
  emit(event: AshibaRetryEvent): void;
};

/**
 * Explicit retry policy for thin-driver retry boundaries.
 *
 * The policy intentionally requires a retry classifier. Ashiba does not infer
 * that arbitrary SQL or workflow code is safe to execute again.
 */
export type AshibaRetryPolicy = {
  maxAttempts: number;
  retryOn(error: unknown, context: AshibaRetryContext): AshibaRetryDecision;
  delayMs?: number | ((context: AshibaRetryContext) => number);
  observer?: AshibaRetryObserver;
};

/**
 * Error raised when an invalid retry policy is passed to the shared helper.
 */
export class AshibaRetryPolicyError extends Error {
  readonly code: 'ASHIBA_RETRY_POLICY_INVALID';
  readonly causeText: string;
  readonly nextAction: string;

  constructor(message: string) {
    super(message);
    this.name = 'AshibaRetryPolicyError';
    this.code = 'ASHIBA_RETRY_POLICY_INVALID';
    this.causeText = 'The retry helper received a policy that cannot define a visible retry boundary.';
    this.nextAction = 'Pass maxAttempts >= 1 and an explicit retryOn classifier. Do not rely on hidden automatic retry.';
  }
}

/**
 * Allowed direction values for safe sort rendering.
 */
export type AshibaSortDirection = 'asc' | 'desc';

/**
 * One reviewed SQL expression exposed as a safe sort key.
 */
export type AshibaSortProfileEntry = {
  sql: string;
  defaultDirection?: AshibaSortDirection;
};

/**
 * Runtime-visible safe sort dictionary keyed by public sort names.
 */
export type AshibaSortProfile = Readonly<Record<string, AshibaSortProfileEntry>>;

/**
 * Sort request supplied by application code after user input has been mapped to a sort key.
 */
export type AshibaSortInput = {
  key: string;
  direction?: AshibaSortDirection;
};

/**
 * CLI-generated query metadata used by runtime adapters without parsing SQL at runtime.
 */
export type AshibaQueryModelAnalysis = {
  astParse: 'ok' | 'failed';
  statementKind: 'select' | 'insert' | 'update' | 'delete' | 'unknown';
  rootQueryShape?: 'simple-select' | 'compound-select' | 'values' | 'non-select' | 'unknown';
  hasTopLevelOrderBy: boolean;
  sourceHash?: string;
  safeSort?: {
    insertion:
      | {
        status: 'ready';
        index: number;
        mode: 'order-by' | 'prepend-comma' | 'comma';
      }
      | {
        status: 'unresolved';
        reason?: string;
      };
    sortable?: Readonly<Record<string, AshibaSortProfileEntry>>;
  };
  optionalConditionCompression?: {
    enabled: true;
    branches: readonly {
      parameterName: string;
      kind: 'expression';
      sourceRange: {
        start: number;
        end: number;
        text?: string;
      };
      removalRange: {
        start: number;
        end: number;
        text?: string;
      };
      presentReplacement: {
        start: number;
        end: number;
        text: string;
      };
    }[];
    groups?: readonly {
      branchIndexes: readonly number[];
      removalRange: {
        start: number;
        end: number;
        text?: string;
      };
      leadingPrefixes?: readonly {
        branchIndexes: readonly number[];
        removalRange: {
          start: number;
          end: number;
          text?: string;
        };
      }[];
    }[];
  };
};

/**
 * Dialect-specific SQL and parameter binding metadata generated by the CLI.
 */
export type FeatureQueryDialectBinding = {
  sourceHash?: string;
  sql: string;
  orderedNames: readonly string[];
};

/**
 * PostgreSQL binding metadata used by safe sort and optional-condition rewrites.
 */
export type FeatureQueryPostgresDialectBinding = FeatureQueryDialectBinding & {
  safeSortInsertion?: {
    index: number;
  };
  optionalConditionCompression?: {
    branches: readonly {
      parameterName: string;
      removalRange: {
        start: number;
        end: number;
        text?: string;
      };
      presentReplacement: {
        start: number;
        end: number;
        text: string;
      };
    }[];
    groups?: readonly {
      branchIndexes: readonly number[];
      removalRange: {
        start: number;
        end: number;
        text?: string;
      };
      leadingPrefixes?: readonly {
        branchIndexes: readonly number[];
        removalRange: {
          start: number;
          end: number;
          text?: string;
        };
      }[];
    }[];
  };
};

/**
 * Dialect binding slots known by the shared feature query model.
 */
export type FeatureQueryDialectBindings = {
  postgres?: FeatureQueryPostgresDialectBinding;
  mysql2?: FeatureQueryDialectBinding;
  mssql?: FeatureQueryDialectBinding;
  sqlite?: FeatureQueryDialectBinding;
};

/**
 * Query model shape consumed by feature-level query boundaries.
 *
 * This is intentionally a contract type, not an ORM model. The SQL file remains
 * the canonical source; generated metadata and runtime snapshots only prove that
 * the thin adapter is executing the reviewed SQL contract.
 */
export type FeatureQueryModel = {
  analysis: AshibaQueryModelAnalysis & {
    resultColumnTypes?: Record<string, string>;
    parameterTypes?: Record<string, string>;
  };
  bindings?: FeatureQueryDialectBindings;
};

/**
 * File-backed SQL query source generated or loaded from a reviewed SQL file.
 */
export interface FeatureQuerySource {
  id: string;
  path: string;
  sqlPath: string;
  sql: string;
  queryModel: FeatureQueryModel;
  optionalConditionCompression?: boolean;
  metadata?: AshibaSqlExecutionMetadata;
}

/**
 * Thin feature-level SQL execution boundary.
 *
 * Feature and workflow code depend on this instead of pg, logger packages, or
 * concrete adapter implementations.
 */
export interface FeatureQueryExecutor {
  query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]>;
}

/**
 * Error raised when a feature query boundary receives a row count that does
 * not match the helper-selected cardinality contract.
 */
export class FeatureQueryCardinalityError extends Error {
  readonly code: 'ASHIBA_QUERY_EXPECTED_ONE_ROW' | 'ASHIBA_QUERY_EXPECTED_ZERO_OR_ONE_ROW';
  readonly queryId: string;
  readonly rowCount: number;
  readonly causeText: string;
  readonly nextAction: string;
  readonly details: { queryId: string; rowCount: number };

  constructor(code: FeatureQueryCardinalityError['code'], query: FeatureQuerySource, rowCount: number) {
    const expected = code === 'ASHIBA_QUERY_EXPECTED_ONE_ROW' ? 'one row' : 'zero or one row';
    super(`${query.id} query expected ${expected}, but got ${rowCount}.`);
    this.name = 'FeatureQueryCardinalityError';
    this.code = code;
    this.queryId = query.id;
    this.rowCount = rowCount;
    this.causeText = 'The selected feature query cardinality helper received a row count outside its contract.';
    this.nextAction = code === 'ASHIBA_QUERY_EXPECTED_ONE_ROW'
      ? 'Use queryMany for mutation workflows that need to handle zero rows, or use queryOne only when the SQL contract really guarantees exactly one row.'
      : 'Use queryMany when multiple rows are valid, or tighten the SQL so queryOneOrNull can only receive zero or one row.';
    this.details = { queryId: query.id, rowCount };
  }
}

/**
 * Execute a feature query and return every row.
 */
export async function queryMany<T = unknown>(
  executor: FeatureQueryExecutor,
  query: FeatureQuerySource,
  params: Record<string, unknown>,
): Promise<T[]> {
  return executor.query<T>(query, params);
}

/**
 * Execute a feature query that must return exactly one row.
 */
export async function queryOne<T = unknown>(
  executor: FeatureQueryExecutor,
  query: FeatureQuerySource,
  params: Record<string, unknown>,
): Promise<T> {
  const rows = await queryMany<T>(executor, query, params);
  if (rows.length !== 1) {
    throw new FeatureQueryCardinalityError('ASHIBA_QUERY_EXPECTED_ONE_ROW', query, rows.length);
  }
  return rows[0] as T;
}

/**
 * Execute a feature query that may return no row, but must not return many.
 */
export async function queryOneOrNull<T = unknown>(
  executor: FeatureQueryExecutor,
  query: FeatureQuerySource,
  params: Record<string, unknown>,
): Promise<T | null> {
  const rows = await queryMany<T>(executor, query, params);
  if (rows.length > 1) {
    throw new FeatureQueryCardinalityError('ASHIBA_QUERY_EXPECTED_ZERO_OR_ONE_ROW', query, rows.length);
  }
  return rows[0] ?? null;
}

/**
 * Run caller-owned work under an explicit retry boundary.
 *
 * This helper retries only when the provided policy says the thrown error is
 * retryable. It does not wrap the final error or decide business idempotency.
 */
export async function withAshibaRetry<T>(
  policy: AshibaRetryPolicy,
  operation: (context: { attempt: number; maxAttempts: number }) => Promise<T>,
): Promise<T> {
  assertRetryPolicy(policy);
  const startedAt = Date.now();
  let attempt = 1;

  for (;;) {
    try {
      return await operation({ attempt, maxAttempts: policy.maxAttempts });
    } catch (error) {
      const context: AshibaRetryContext = {
        attempt,
        maxAttempts: policy.maxAttempts,
        elapsedMs: Date.now() - startedAt,
        error,
      };
      const decision = normalizeRetryDecision(policy.retryOn(error, context));
      const shouldRetry = decision.retry && attempt < policy.maxAttempts;
      const delayMs = shouldRetry ? resolveRetryDelayMs(policy, context, decision) : undefined;
      policy.observer?.emit({
        phase: shouldRetry ? 'retry' : 'give-up',
        attempt,
        maxAttempts: policy.maxAttempts,
        elapsedMs: context.elapsedMs,
        ...(delayMs !== undefined ? { delayMs } : {}),
        ...(decision.reason ? { reason: decision.reason } : {}),
        error: normalizeError(error),
      });

      if (!shouldRetry) {
        throw error;
      }

      const retryDelayMs = delayMs ?? 0;
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs);
      }
      attempt += 1;
    }
  }
}

/**
 * Error raised when a safe sort request violates the reviewed query model or sort profile.
 */
export class AshibaSortError extends Error {
  readonly code:
    | 'ASHIBA_UNKNOWN_SORT_KEY'
    | 'ASHIBA_INVALID_SORT_DIRECTION'
    | 'ASHIBA_EMPTY_SORT_PROFILE'
    | 'ASHIBA_SORT_QUERY_MODEL_REQUIRED'
    | 'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL'
    | 'ASHIBA_SORT_QUERY_MODEL_STALE'
    | 'ASHIBA_SORT_INSERTION_UNRESOLVED'
    | 'ASHIBA_SORT_PROFILE_OUTSIDE_QUERY_MODEL';
  readonly causeText: string;
  readonly nextAction: string;

  constructor(code: AshibaSortError['code'], message: string) {
    super(message);
    this.name = 'AshibaSortError';
    this.code = code;
    this.causeText = describeSortErrorCause(code);
    this.nextAction = describeSortErrorNextAction(code);
  }
}

/**
 * Return parameter values according to the requested event masking policy.
 */
export function maskParams(values: readonly unknown[], policy: AshibaMaskPolicy = 'always'): readonly unknown[] | undefined {
  if (policy === 'never') return values;
  return values.map(maskValue);
}

/**
 * Render an ORDER BY clause from a reviewed safe sort profile and validated sort input.
 */
export function renderSafeOrderBy(profile: AshibaSortProfile, input: readonly AshibaSortInput[]): string {
  if (input.length === 0) return '';
  if (Object.keys(profile).length === 0) {
    throw new AshibaSortError('ASHIBA_EMPTY_SORT_PROFILE', 'Sort profile is empty.');
  }

  const fragments = input.map((item) => {
    const entry = profile[item.key];
    if (!entry) {
      throw new AshibaSortError('ASHIBA_UNKNOWN_SORT_KEY', `Unknown sort key: ${item.key}`);
    }

    const direction = item.direction ?? entry.defaultDirection ?? 'asc';
    if (direction !== 'asc' && direction !== 'desc') {
      throw new AshibaSortError('ASHIBA_INVALID_SORT_DIRECTION', `Invalid sort direction for ${item.key}.`);
    }

    return `${entry.sql} ${direction}`;
  });

  return `order by ${fragments.join(', ')}`;
}

/**
 * Convert unknown thrown values into the structured error shape used by driver events.
 */
export function normalizeError(error: unknown): { name: string; message: string; code?: string; cause?: string; nextAction?: string } {
  if (error instanceof Error) {
    const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    const cause = 'causeText' in error && typeof error.causeText === 'string' ? error.causeText : undefined;
    const nextAction = 'nextAction' in error && typeof error.nextAction === 'string' ? error.nextAction : undefined;
    return {
      name: error.name,
      message: error.message,
      ...(maybeCode ? { code: maybeCode } : {}),
      ...(cause ? { cause } : {}),
      ...(nextAction ? { nextAction } : {}),
    };
  }

  return {
    name: 'Error',
    message: String(error),
  };
}

function assertRetryPolicy(policy: AshibaRetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new AshibaRetryPolicyError('Retry policy maxAttempts must be an integer greater than or equal to 1.');
  }
  if (typeof policy.retryOn !== 'function') {
    throw new AshibaRetryPolicyError('Retry policy must provide an explicit retryOn classifier.');
  }
}

function normalizeRetryDecision(decision: AshibaRetryDecision): { retry: boolean; reason?: string; delayMs?: number } {
  if (typeof decision === 'boolean') {
    return { retry: decision };
  }
  return {
    retry: decision.retry,
    ...(decision.reason ? { reason: decision.reason } : {}),
    ...(decision.delayMs !== undefined ? { delayMs: decision.delayMs } : {}),
  };
}

function resolveRetryDelayMs(
  policy: AshibaRetryPolicy,
  context: AshibaRetryContext,
  decision: { delayMs?: number },
): number {
  const value = decision.delayMs ?? (typeof policy.delayMs === 'function' ? policy.delayMs(context) : policy.delayMs) ?? 0;
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function describeSortErrorCause(code: AshibaSortError['code']): string {
  switch (code) {
    case 'ASHIBA_EMPTY_SORT_PROFILE':
      return 'Safe sort was requested, but no reviewed sortable keys are available.';
    case 'ASHIBA_UNKNOWN_SORT_KEY':
      return 'The requested sort key is not present in the reviewed safe sort profile.';
    case 'ASHIBA_INVALID_SORT_DIRECTION':
      return 'The requested sort direction is outside the allowed asc/desc values.';
    case 'ASHIBA_SORT_QUERY_MODEL_REQUIRED':
      return 'Safe sort requires CLI-generated query model metadata so the driver does not parse SQL at runtime.';
    case 'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL':
      return 'The query model shape is not supported for driver-side safe sort rendering.';
    case 'ASHIBA_SORT_QUERY_MODEL_STALE':
      return 'The query model metadata does not match the SQL being executed or is missing required dialect metadata.';
    case 'ASHIBA_SORT_INSERTION_UNRESOLVED':
      return 'The query model does not contain a resolved ORDER BY insertion position.';
    case 'ASHIBA_SORT_PROFILE_OUTSIDE_QUERY_MODEL':
      return 'The runtime sort profile attempted to use SQL outside the CLI-generated sortable metadata.';
  }
}

function describeSortErrorNextAction(code: AshibaSortError['code']): string {
  switch (code) {
    case 'ASHIBA_EMPTY_SORT_PROFILE':
      return 'Regenerate query model metadata with safe-sort analysis or disable safe sort for this query.';
    case 'ASHIBA_UNKNOWN_SORT_KEY':
      return 'Use one of the sortable keys recorded in the query model, or update the SQL and regenerate metadata.';
    case 'ASHIBA_INVALID_SORT_DIRECTION':
      return 'Use asc or desc for the requested sort direction.';
    case 'ASHIBA_SORT_QUERY_MODEL_REQUIRED':
      return 'Run model generation for the visible SQL and pass the resulting query model to the driver adapter.';
    case 'ASHIBA_SORT_UNSUPPORTED_QUERY_MODEL':
      return 'Rewrite the SQL into a supported shape, such as wrapping a compound query in an explicit subquery, then regenerate metadata.';
    case 'ASHIBA_SORT_QUERY_MODEL_STALE':
      return 'Regenerate query model metadata from the current visible SQL and pass the matching dialect binding metadata.';
    case 'ASHIBA_SORT_INSERTION_UNRESOLVED':
      return 'Review the unsupported SQL shape, adjust it if needed, and regenerate query model metadata before enabling safe sort.';
    case 'ASHIBA_SORT_PROFILE_OUTSIDE_QUERY_MODEL':
      return 'Use the SQL expressions recorded in the query model sortable dictionary, or regenerate metadata after changing the visible SQL.';
  }
}

function maskValue(value: unknown): string {
  if (value === null || value === undefined) return '<nullish>';
  return '<masked>';
}
