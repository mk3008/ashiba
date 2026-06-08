import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type SqlExecutionLogEvent = {
  phase: 'start' | 'end' | 'error';
  warnings?: readonly { code: string; message: string; nextAction?: string }[];
  [key: string]: unknown;
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
  const metadata = event.metadata as { sqlId?: unknown; queryId?: unknown; sqlPath?: unknown } | undefined;
  const includeSqlText = process.env.ASHIBA_DEMO_SQL_LOG_SQL_TEXT === '1';
  const includeParams = process.env.ASHIBA_DEMO_SQL_LOG_PARAMS === '1';
  const logEvent = {
    timestamp: new Date().toISOString(),
    phase: event.phase,
    sqlId: metadata?.sqlId,
    queryId: metadata?.queryId,
    sqlPath: metadata?.sqlPath,
    orderedNames: event.orderedNames,
    elapsedMs: event.elapsedMs,
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
