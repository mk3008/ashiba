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
  const metadata = event.metadata as { sqlPath?: unknown } | undefined;
  console.log(JSON.stringify({
    phase: event.phase,
    sqlPath: metadata?.sqlPath,
    compiledSql: event.compiledSql,
    orderedNames: event.orderedNames,
    error: event.error,
  }, null, 2));
}
