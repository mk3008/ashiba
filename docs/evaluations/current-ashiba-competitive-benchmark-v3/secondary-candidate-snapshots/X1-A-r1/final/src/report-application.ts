import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
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

export interface ReportRuntime {
  connectionString: string;
  schema: string;
}

class ReportApplicationError extends Error {
  readonly code: 'VALIDATION' | 'APPLICATION_CLOSED';

  constructor(code: ReportApplicationError['code'], message: string) {
    super(message);
    this.name = 'ReportApplicationError';
    this.code = code;
  }
}

const DIMENSION_SQL: Readonly<Record<Dimension, string>> = {
  status: 't.status AS "status"',
  assignee: 't.assignee AS "assignee"',
  tag: 'tt.tag AS "tag"',
};

const GROUP_SQL: Readonly<Record<Dimension, string>> = {
  status: 't.status',
  assignee: 't.assignee',
  tag: 'tt.tag',
};

const METRIC_SQL: Readonly<Record<Metric, string>> = {
  count: 'COUNT(DISTINCT t.id) AS "metric"',
  priorityTotal: 'SUM(t.priority) AS "metric"',
};

const STATUS_VALUES = new Set(['open', 'pending', 'closed']);

function validationError(message: string): ReportApplicationError {
  return new ReportApplicationError('VALIDATION', message);
}

function assertRequest(input: ReportRequest): void {
  if (!input || typeof input !== 'object') {
    throw validationError('A report request is required.');
  }

  if (!Array.isArray(input.dimensions) || input.dimensions.length === 0) {
    throw validationError('At least one dimension is required.');
  }

  const seen = new Set<string>();
  for (const dimension of input.dimensions) {
    if (!(dimension in DIMENSION_SQL) || seen.has(dimension)) {
      throw validationError('Dimensions must be unique supported values.');
    }
    seen.add(dimension);
  }

  if (!(input.metric in METRIC_SQL)) {
    throw validationError('Metric must be supported.');
  }

  if (typeof input.includeTagJoin !== 'boolean') {
    throw validationError('includeTagJoin must be a boolean.');
  }

  if (input.dimensions.includes('tag') && !input.includeTagJoin) {
    throw validationError('tag requires includeTagJoin.');
  }

  if (input.requestedTag !== undefined) {
    if (typeof input.requestedTag !== 'string' || !input.includeTagJoin) {
      throw validationError('requestedTag requires includeTagJoin.');
    }
  }

  if (input.statuses !== undefined) {
    if (!Array.isArray(input.statuses) || input.statuses.some((status) => !STATUS_VALUES.has(status))) {
      throw validationError('statuses must contain only supported values.');
    }
  }
}

function makeSourceSql(input: ReportRequest): string {
  const select = input.dimensions.map((dimension) => DIMENSION_SQL[dimension]).join(',\n  ');
  const groupBy = input.dimensions.map((dimension) => GROUP_SQL[dimension]).join(', ');
  const orderBy = input.dimensions
    .map((dimension) => `${GROUP_SQL[dimension]} ASC NULLS LAST`)
    .join(', ');
  const join = !input.includeTagJoin
    ? ''
    : input.dimensions.includes('tag') || input.requestedTag !== undefined
      ? '\nJOIN (SELECT DISTINCT ticket_id, tag FROM ticket_tags) AS tt ON tt.ticket_id = t.id'
      : '\nJOIN (SELECT DISTINCT ticket_id FROM ticket_tags) AS tt ON tt.ticket_id = t.id';
  const predicates: string[] = [];

  if (input.statuses !== undefined) {
    predicates.push('t.status = ANY(:statuses)');
  }
  if (input.requestedTag !== undefined) {
    predicates.push('tt.tag = :requestedTag');
  }

  const where = predicates.length === 0 ? '' : `\nWHERE ${predicates.join('\n  AND ')}`;

  return `SELECT\n  ${select},\n  ${METRIC_SQL[input.metric]}\nFROM tickets AS t${join}${where}\nGROUP BY ${groupBy}\nORDER BY ${orderBy}`;
}

function normalizeRows(rows: readonly Record<string, unknown>[]): Record<string, string | number | null>[] {
  return rows.map((row) => {
    const normalized: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'metric') {
        const numberValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numberValue)) {
          throw new Error('The database returned a non-numeric report metric.');
        }
        normalized[key] = numberValue;
      } else if (value === null || typeof value === 'string' || typeof value === 'number') {
        normalized[key] = value;
      } else {
        throw new Error(`The database returned an unsupported value for ${key}.`);
      }
    }
    return normalized;
  });
}

export function createReportApplication(runtime: ReportRuntime): ReportApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const ensureOpen = (): void => {
    if (closed) {
      throw new ReportApplicationError('APPLICATION_CLOSED', 'The report application is closed.');
    }
  };

  return {
    async runReport(input: ReportRequest): Promise<ReportResult> {
      ensureOpen();
      assertRequest(input);

      const sourceSql = makeSourceSql(input);
      const prepared = compileNamedParameters(sourceSql);
      const parameters: Record<string, unknown> = {};
      if (input.statuses !== undefined) {
        parameters.statuses = input.statuses;
      }
      if (input.requestedTag !== undefined) {
        parameters.requestedTag = input.requestedTag;
      }
      const bound = bindNamedParameters(prepared, parameters);
      const result = await pool.query<Record<string, unknown>>({
        text: bound.sql,
        values: [...bound.values],
      });

      return {
        rows: normalizeRows(result.rows),
        sourceSql,
        executedSql: bound.sql,
        params: bound.values,
      };
    },

    async close(): Promise<void> {
      if (!closePromise) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
