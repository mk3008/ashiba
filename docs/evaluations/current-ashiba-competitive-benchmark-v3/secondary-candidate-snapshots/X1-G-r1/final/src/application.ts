import { Pool } from 'pg';

export type Dimension = 'status' | 'assignee' | 'tag';
export type Metric = 'count' | 'priorityTotal';

export interface ReportRequest {
  dimensions: readonly Dimension[];
  metric: Metric;
  includeTagJoin: boolean;
  statuses?: readonly ('open' | 'pending' | 'closed')[];
  requestedTag?: string;
}

export interface ReportResult {
  rows: readonly Record<string, string | number | null>[];
  sourceSql: string;
  executedSql: string;
  params: readonly unknown[];
}

export interface ReportApplication {
  runReport(input: ReportRequest): Promise<ReportResult>;
  close(): Promise<void>;
}

export interface Runtime {
  connectionString: string;
  schema: string;
}

type ApplicationErrorCode = 'VALIDATION' | 'APPLICATION_CLOSED';

interface ApplicationError extends Error {
  code: ApplicationErrorCode;
}

/** Reviewed finite mapping: caller values never become SQL syntax. */
const DIMENSIONS: Record<Dimension, { select: string; groupBy: string; orderBy: string }> = {
  status: { select: 't.status::text AS "status"', groupBy: 't.status', orderBy: 't.status::text ASC NULLS LAST' },
  assignee: { select: 't.assignee AS "assignee"', groupBy: 't.assignee', orderBy: 't.assignee ASC NULLS LAST' },
  tag: { select: 'tt.tag AS "tag"', groupBy: 'tt.tag', orderBy: 'tt.tag ASC NULLS LAST' },
};

const METRICS: Record<Metric, string> = {
  // PostgreSQL bigint aggregates decode as strings in pg; the API requires numbers.
  count: 'COUNT(*)::integer AS "metric"',
  priorityTotal: 'SUM(t.priority)::integer AS "metric"',
};

const STATUSES = new Set(['open', 'pending', 'closed']);

function applicationError(code: ApplicationErrorCode, message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateRequest(input: ReportRequest): void {
  if (input === null || typeof input !== 'object' || !Array.isArray(input.dimensions)) {
    throw applicationError('VALIDATION', 'dimensions must be a non-empty array');
  }
  if (input.dimensions.length === 0 || new Set(input.dimensions).size !== input.dimensions.length) {
    throw applicationError('VALIDATION', 'dimensions must be non-empty and unique');
  }
  for (const dimension of input.dimensions) {
    if (typeof dimension !== 'string' || !Object.hasOwn(DIMENSIONS, dimension)) {
      throw applicationError('VALIDATION', 'unknown report dimension');
    }
  }
  if (typeof input.metric !== 'string' || !Object.hasOwn(METRICS, input.metric)) {
    throw applicationError('VALIDATION', 'unknown report metric');
  }
  if (typeof input.includeTagJoin !== 'boolean') {
    throw applicationError('VALIDATION', 'includeTagJoin must be a boolean');
  }
  if (input.dimensions.includes('tag') && !input.includeTagJoin) {
    throw applicationError('VALIDATION', 'tag requires includeTagJoin');
  }
  if (input.requestedTag !== undefined && typeof input.requestedTag !== 'string') {
    throw applicationError('VALIDATION', 'requestedTag must be a string');
  }
  if (input.requestedTag !== undefined && !input.includeTagJoin) {
    throw applicationError('VALIDATION', 'requestedTag requires includeTagJoin');
  }
  if (input.statuses !== undefined && (!Array.isArray(input.statuses) || input.statuses.some((status) => typeof status !== 'string' || !STATUSES.has(status)))) {
    throw applicationError('VALIDATION', 'statuses must contain only known ticket statuses');
  }
}

function buildReport(input: ReportRequest): { sql: string; params: unknown[] } {
  const dimensions = input.dimensions as readonly Dimension[];
  const params: unknown[] = [];
  const predicates: string[] = [];

  if (input.statuses !== undefined) {
    params.push([...input.statuses]);
    predicates.push(`t.status::text = ANY($${params.length}::text[])`);
  }
  if (input.requestedTag !== undefined) {
    params.push(input.requestedTag);
    predicates.push(`tt.tag = $${params.length}`);
  }

  const sql = [
    `SELECT ${[...dimensions.map((dimension) => DIMENSIONS[dimension].select), METRICS[input.metric]].join(', ')}`,
    'FROM tickets AS t',
    input.includeTagJoin ? 'INNER JOIN ticket_tags AS tt ON tt.ticket_id = t.id' : '',
    predicates.length > 0 ? `WHERE ${predicates.join(' AND ')}` : '',
    `GROUP BY ${dimensions.map((dimension) => DIMENSIONS[dimension].groupBy).join(', ')}`,
    `ORDER BY ${dimensions.map((dimension) => DIMENSIONS[dimension].orderBy).join(', ')}`,
  ].filter(Boolean).join('\n');

  return { sql, params };
}

export function createReportApplication(runtime: Runtime): ReportApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async runReport(input: ReportRequest): Promise<ReportResult> {
      if (closed) {
        throw applicationError('APPLICATION_CLOSED', 'application is closed');
      }
      validateRequest(input);
      const { sql, params } = buildReport(input);
      const result = await pool.query<Record<string, string | number | null>>(sql, params);
      return { rows: result.rows, sourceSql: sql, executedSql: sql, params };
    },

    close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      return closePromise;
    },
  };
}
