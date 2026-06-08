import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type SqlExecutionLogEvent = {
  phase: 'start' | 'end' | 'error';
  executionId?: string;
  warnings?: readonly { code: string; message: string; nextAction?: string }[];
  [key: string]: unknown;
};

type ParameterSummary = {
  name: string;
  placeholders: string[];
  occurrenceCount: number;
};

/**
 * SQL execution log hook called by src/adapters/pg/pool.ts.
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
  if (process.env.ASHIBA_DEMO_SQL_LOG !== '1') {
    return;
  }
  const metadata = event.metadata as { sqlId?: unknown; queryId?: unknown; requestId?: unknown; sqlPath?: unknown } | undefined;
  const orderedNames = Array.isArray(event.orderedNames) ? event.orderedNames.filter((name): name is string => typeof name === 'string') : [];
  const includeSqlText = process.env.ASHIBA_DEMO_SQL_LOG_SQL_TEXT === '1';
  const includeParams = process.env.ASHIBA_DEMO_SQL_LOG_PARAMS === '1';
  const elapsedMs = typeof event.elapsedMs === 'number' ? event.elapsedMs : undefined;
  const logEvent = {
    timestamp: new Date().toISOString(),
    level: event.phase === 'error' ? 'error' : 'info',
    service: 'support-inbox-demo',
    phase: event.phase,
    pid: process.pid,
    requestId: metadata?.requestId,
    executionId: event.executionId,
    sqlId: metadata?.sqlId,
    queryId: metadata?.queryId,
    sqlPath: metadata?.sqlPath,
    orderedNames,
    parameterSummary: summarizeParameters(orderedNames),
    elapsedMs,
    durationBucket: bucketDuration(elapsedMs),
    rowCount: event.rowCount,
    warnings: event.warnings,
    error: event.error,
    ...(includeSqlText ? { compiledSql: event.compiledSql } : {}),
    ...(includeParams ? { params: event.params, maskedParams: event.maskedParams } : {}),
  };
  const logLine = JSON.stringify(logEvent);
  const logFile = resolve(process.env.ASHIBA_DEMO_SQL_LOG_FILE ?? '.logs/sql.log');
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, `${logLine}\n`, 'utf8');

  if (process.env.ASHIBA_DEMO_SQL_LOG_CONSOLE !== '0') {
    console.log(JSON.stringify(logEvent, null, 2));
  }
}

function summarizeParameters(orderedNames: readonly string[]): ParameterSummary[] {
  const byName = new Map<string, string[]>();
  orderedNames.forEach((name, index) => {
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
