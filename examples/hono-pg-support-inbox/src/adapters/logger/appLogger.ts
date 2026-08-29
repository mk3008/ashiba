import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

export type LogProfile = 'off' | 'minimal' | 'standard' | 'debug' | 'trace';

export type SqlExecutionLogEvent = {
  phase: 'start' | 'end' | 'error';
  executionId?: string;
  warnings?: readonly { code: string; message: string; nextAction?: string }[];
  [key: string]: unknown;
};

export type ApiRequestLogEvent = {
  phase: 'start' | 'end' | 'error';
  requestId: string;
  apiMethod: string;
  apiPath: string;
  apiRoute: string;
  operation?: string;
  status?: number;
  elapsedMs?: number;
  error?: unknown;
};

type ParameterSummary = {
  name: string;
  placeholders: string[];
  occurrenceCount: number;
};

export type LogPolicy = {
  profile: LogProfile;
  includeStartEvents: boolean;
  includeApiEvents: boolean;
  includeSqlEvents: boolean;
  includeRouteDetails: boolean;
  includeParameterNames: boolean;
  includeQueryShape: boolean;
  includeHashes: boolean;
  includeSqlText: boolean;
  includeParams: boolean;
};

export type LogPolicyOverrides = Partial<Omit<LogPolicy, 'profile'>>;

export type LogPolicyConfig = {
  profile?: LogProfile;
  overrides?: LogPolicyOverrides;
};

let configuredLogPolicy: LogPolicy | undefined;

/**
 * Application log hook used by the web adapter and PostgreSQL adapter boundary.
 *
 * This is the intended hole for your application logger.
 * Wire pino, winston, console, OpenTelemetry, or your logger here.
 *
 * Keep feature code on this path:
 *   query -> feature -> sqlClient -> logger
 *
 * Feature code should not import logger packages directly.
 */
export function logSqlExecution(event: SqlExecutionLogEvent): void {
  const policy = resolveLogPolicy();
  if (!shouldLogEvent(policy, 'sql_execution', event.phase)) {
    return;
  }
  const metadata = event.metadata as {
    sqlId?: unknown;
    queryId?: unknown;
    requestId?: unknown;
    apiMethod?: unknown;
    apiPath?: unknown;
    apiRoute?: unknown;
    sqlPath?: unknown;
  } | undefined;
  const elapsedMs = typeof event.elapsedMs === 'number' ? event.elapsedMs : undefined;
  const logEvent: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    eventType: 'sql_execution',
    level: event.phase === 'error' ? 'error' : 'info',
    service: 'support-inbox-demo',
    phase: event.phase,
    pid: process.pid,
    profile: policy.profile,
    requestId: metadata?.requestId,
    apiRoute: metadata?.apiRoute,
    executionId: event.executionId,
    sqlId: metadata?.sqlId,
    queryId: metadata?.queryId,
    sqlPath: metadata?.sqlPath,
    elapsedMs,
    durationBucket: bucketDuration(elapsedMs),
    rowCount: event.rowCount,
    warnings: event.warnings,
    error: event.error,
  };
  if (policy.includeRouteDetails) {
    logEvent.apiMethod = metadata?.apiMethod;
    logEvent.apiPath = metadata?.apiPath;
  }
  if (policy.includeParameterNames) {
    const parameterNames = getParameterNames(event);
    logEvent.parameterNames = parameterNames;
    logEvent.parameterSummary = summarizeParameters(parameterNames);
  }
  if (policy.includeQueryShape) {
    Object.assign(logEvent, extractQueryShape(metadata));
  }
  if (policy.includeHashes) {
    Object.assign(logEvent, buildSqlHashes(event));
  }
  if (policy.includeSqlText) {
    logEvent.sourceSql = event.sourceSql;
    logEvent.compiledSql = event.compiledSql;
  }
  if (policy.includeParams) {
    logEvent.params = event.params;
    logEvent.maskedParams = event.maskedParams;
  }
  writeAppLog(logEvent);
}

export function logApiRequest(event: ApiRequestLogEvent): void {
  const policy = resolveLogPolicy();
  if (!shouldLogEvent(policy, 'api_request', event.phase)) {
    return;
  }
  const logEvent: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    eventType: 'api_request',
    level: event.phase === 'error' ? 'error' : 'info',
    service: 'support-inbox-demo',
    phase: event.phase,
    pid: process.pid,
    profile: policy.profile,
    requestId: event.requestId,
    apiRoute: event.apiRoute,
    status: event.status,
    elapsedMs: event.elapsedMs,
    durationBucket: bucketDuration(event.elapsedMs),
    error: normalizeError(event.error),
  };
  if (policy.includeQueryShape) {
    logEvent.operation = event.operation;
  }
  if (policy.includeRouteDetails) {
    logEvent.apiMethod = event.apiMethod;
    logEvent.apiPath = event.apiPath;
  }
  writeAppLog(logEvent);
}

export function configureAppLogger(config?: LogPolicyConfig): void {
  configuredLogPolicy = config ? createLogPolicy(config) : undefined;
}

export function createLogPolicy(config: LogPolicyConfig = {}): LogPolicy {
  return {
    ...presetPolicy(config.profile ?? 'off'),
    ...definedOverrides(config.overrides),
  };
}

export function createLogPolicyFromEnv(env: NodeJS.ProcessEnv = process.env): LogPolicy {
  const profile = normalizeProfile(env.ASHIBA_DEMO_LOG_PROFILE);
  const enabledByLegacyFlag = env.ASHIBA_DEMO_LOG === '1' || env.ASHIBA_DEMO_SQL_LOG === '1';
  return createLogPolicy({
    profile: profile ?? (enabledByLegacyFlag ? 'standard' : 'off'),
    overrides: {
      includeStartEvents: env.ASHIBA_DEMO_LOG_START_EVENTS === '1' ? true : undefined,
      includeApiEvents: env.ASHIBA_DEMO_LOG_API_EVENTS === '0' ? false : undefined,
      includeSqlEvents: env.ASHIBA_DEMO_LOG_SQL_EVENTS === '0' ? false : undefined,
      includeSqlText: env.ASHIBA_DEMO_SQL_LOG_SQL_TEXT === '1' ? true : undefined,
      includeParams: env.ASHIBA_DEMO_SQL_LOG_PARAMS === '1' ? true : undefined,
    },
  });
}

function resolveLogPolicy(): LogPolicy {
  return configuredLogPolicy ?? createLogPolicyFromEnv();
}

function summarizeParameters(parameterNames: readonly string[]): ParameterSummary[] {
  const byName = new Map<string, string[]>();
  parameterNames.forEach((name, index) => {
    const placeholders = byName.get(name) ?? [];
    placeholders.push(`$${index + 1}`);
    byName.set(name, placeholders);
  });
  return [...byName.entries()].map(([name, placeholders]) => ({
    name,
    placeholders,
    occurrenceCount: placeholders.length,
  }));
}

function getParameterNames(event: SqlExecutionLogEvent): string[] {
  return Array.isArray(event.parameterNames) ? event.parameterNames.filter((name): name is string => typeof name === 'string') : [];
}

function bucketDuration(elapsedMs: number | undefined): string | undefined {
  if (elapsedMs === undefined) {
    return undefined;
  }
  if (elapsedMs < 10) {
    return '<10ms';
  }
  if (elapsedMs < 50) {
    return '10-49ms';
  }
  if (elapsedMs < 100) {
    return '50-99ms';
  }
  if (elapsedMs < 500) {
    return '100-499ms';
  }
  if (elapsedMs < 1000) {
    return '500-999ms';
  }
  return '>=1000ms';
}

function writeAppLog(logEvent: Record<string, unknown>): void {
  const logLine = JSON.stringify(logEvent);
  const logFile = resolve(process.env.ASHIBA_DEMO_LOG_FILE ?? process.env.ASHIBA_DEMO_SQL_LOG_FILE ?? '.logs/app.log');
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, `${logLine}\n`, 'utf8');

  if (process.env.ASHIBA_DEMO_LOG_CONSOLE !== '0' && process.env.ASHIBA_DEMO_SQL_LOG_CONSOLE !== '0') {
    console.log(JSON.stringify(logEvent, null, 2));
  }
}

function normalizeProfile(value: string | undefined): LogProfile | undefined {
  if (value === 'off' || value === 'minimal' || value === 'standard' || value === 'debug' || value === 'trace') {
    return value;
  }
  return undefined;
}

function presetPolicy(profile: LogProfile): LogPolicy {
  switch (profile) {
    case 'minimal':
      return {
        profile,
        includeStartEvents: false,
        includeApiEvents: true,
        includeSqlEvents: true,
        includeRouteDetails: false,
        includeParameterNames: false,
        includeQueryShape: false,
        includeHashes: false,
        includeSqlText: false,
        includeParams: false,
      };
    case 'standard':
      return {
        profile,
        includeStartEvents: true,
        includeApiEvents: true,
        includeSqlEvents: true,
        includeRouteDetails: true,
        includeParameterNames: true,
        includeQueryShape: false,
        includeHashes: false,
        includeSqlText: false,
        includeParams: false,
      };
    case 'debug':
      return {
        profile,
        includeStartEvents: true,
        includeApiEvents: true,
        includeSqlEvents: true,
        includeRouteDetails: true,
        includeParameterNames: true,
        includeQueryShape: true,
        includeHashes: true,
        includeSqlText: false,
        includeParams: false,
      };
    case 'trace':
      return {
        profile,
        includeStartEvents: true,
        includeApiEvents: true,
        includeSqlEvents: true,
        includeRouteDetails: true,
        includeParameterNames: true,
        includeQueryShape: true,
        includeHashes: true,
        includeSqlText: true,
        includeParams: true,
      };
    case 'off':
    default:
      return {
        profile: 'off',
        includeStartEvents: false,
        includeApiEvents: false,
        includeSqlEvents: false,
        includeRouteDetails: false,
        includeParameterNames: false,
        includeQueryShape: false,
        includeHashes: false,
        includeSqlText: false,
        includeParams: false,
      };
  }
}

function definedOverrides(overrides: LogPolicyOverrides | undefined): LogPolicyOverrides {
  if (!overrides) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(overrides).filter((entry): entry is [keyof LogPolicyOverrides, boolean] => entry[1] !== undefined),
  ) as LogPolicyOverrides;
}

function shouldLogEvent(policy: LogPolicy, eventType: 'api_request' | 'sql_execution', phase: 'start' | 'end' | 'error'): boolean {
  if (policy.profile === 'off') {
    return false;
  }
  if (eventType === 'api_request' && !policy.includeApiEvents) {
    return false;
  }
  if (eventType === 'sql_execution' && !policy.includeSqlEvents) {
    return false;
  }
  if (phase === 'start' && !policy.includeStartEvents) {
    return false;
  }
  return true;
}

function extractQueryShape(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) {
    return {};
  }
  return {
    operation: metadata.operation,
    filterKeys: metadata.filterKeys,
    sortKeys: metadata.sortKeys,
    queryVariant: metadata.queryVariant,
  };
}

function buildSqlHashes(event: SqlExecutionLogEvent): Record<string, unknown> {
  return {
    sourceSqlHash: typeof event.sourceSql === 'string' ? sha256(event.sourceSql) : undefined,
    compiledSqlHash: typeof event.compiledSql === 'string' ? sha256(event.compiledSql) : undefined,
  };
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function normalizeError(error: unknown): { name: string; message: string; code?: string } | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const errorLike = error as { name?: unknown; message?: unknown; code?: unknown };
  return {
    name: typeof errorLike.name === 'string' ? errorLike.name : 'Error',
    message: typeof errorLike.message === 'string' ? errorLike.message : String(error),
    code: typeof errorLike.code === 'string' ? errorLike.code : undefined,
  };
}
