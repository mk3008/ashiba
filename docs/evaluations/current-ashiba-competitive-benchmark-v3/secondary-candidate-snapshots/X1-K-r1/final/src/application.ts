import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

type TicketStatus = 'open' | 'pending' | 'closed';
type Dimension = 'status' | 'assignee' | 'tag';
type Metric = 'count' | 'priorityTotal';

export interface ReportRequest {
  dimensions: readonly Dimension[];
  metric: Metric;
  includeTagJoin: boolean;
  statuses?: readonly TicketStatus[];
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

interface TicketsTable {
  id: bigint;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
}

interface TicketTagsTable {
  ticket_id: bigint;
  tag: string;
}

interface Database {
  tickets: TicketsTable;
  ticket_tags: TicketTagsTable;
}

type ApplicationErrorCode = 'VALIDATION' | 'APPLICATION_CLOSED';

function applicationError(code: ApplicationErrorCode): Error & { code: ApplicationErrorCode } {
  const error = new Error(code) as Error & { code: ApplicationErrorCode };
  error.code = code;
  return error;
}

const DIMENSION_DEFINITIONS: Record<Dimension, {
  expression: () => any;
  groupBy: string;
}> = {
  status: {
    expression: () => sql<string | null>`${sql.ref('t.status')}`.as('status'),
    groupBy: 't.status',
  },
  assignee: {
    expression: () => sql<string | null>`${sql.ref('t.assignee')}`.as('assignee'),
    groupBy: 't.assignee',
  },
  tag: {
    expression: () => sql<string | null>`${sql.ref('tt.tag')}`.as('tag'),
    groupBy: 'tt.tag',
  },
};

const VALID_STATUSES = new Set<TicketStatus>(['open', 'pending', 'closed']);
const VALID_METRICS = new Set<Metric>(['count', 'priorityTotal']);
const VALID_DIMENSIONS = new Set<Dimension>(['status', 'assignee', 'tag']);

function validateRequest(input: ReportRequest): void {
  if (input === null || typeof input !== 'object' || !Array.isArray(input.dimensions)) {
    throw applicationError('VALIDATION');
  }
  if (input.dimensions.length === 0 || new Set(input.dimensions).size !== input.dimensions.length) {
    throw applicationError('VALIDATION');
  }
  if (!input.dimensions.every((dimension): dimension is Dimension => VALID_DIMENSIONS.has(dimension))) {
    throw applicationError('VALIDATION');
  }
  if (!VALID_METRICS.has(input.metric) || typeof input.includeTagJoin !== 'boolean') {
    throw applicationError('VALIDATION');
  }
  if (input.dimensions.includes('tag') && !input.includeTagJoin) {
    throw applicationError('VALIDATION');
  }
  if (input.statuses !== undefined && (!Array.isArray(input.statuses) || !input.statuses.every((status): status is TicketStatus => VALID_STATUSES.has(status)))) {
    throw applicationError('VALIDATION');
  }
  if (input.requestedTag !== undefined && (typeof input.requestedTag !== 'string' || !input.includeTagJoin)) {
    throw applicationError('VALIDATION');
  }
}

export function createReportApplication(runtime: ReportRuntime): ReportApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async runReport(input: ReportRequest): Promise<ReportResult> {
      if (closed) {
        throw applicationError('APPLICATION_CLOSED');
      }
      validateRequest(input);

      const definitions = input.dimensions.map((dimension) => DIMENSION_DEFINITIONS[dimension]);
      const metric = input.metric === 'count'
        ? sql<number>`count(distinct ${sql.ref('t.id')})`.as('metric')
        : sql<number>`sum(${sql.ref('t.priority')})`.as('metric');

      let query: any = db
        .selectFrom('tickets as t')
        .select([...definitions.map((definition) => definition.expression()), metric]);

      if (input.includeTagJoin) {
        query = query.innerJoin('ticket_tags as tt', 'tt.ticket_id', 't.id');
      }
      if (input.statuses !== undefined) {
        query = query.where('t.status', 'in', input.statuses);
      }
      if (input.requestedTag !== undefined) {
        query = query.where('tt.tag', '=', input.requestedTag);
      }

      query = query.groupBy(definitions.map((definition) => definition.groupBy));
      for (const definition of definitions) {
        // PostgreSQL's ascending order places NULL values last by default.
        query = query.orderBy(definition.groupBy, 'asc');
      }

      const compiled = query.compile();
      const result = await db.executeQuery(compiled);
      const rows = result.rows.map((row: unknown) => {
        const source = row as Record<string, unknown>;
        const output: Record<string, string | number | null> = {};
        for (const dimension of input.dimensions) {
          const value = source[dimension];
          output[dimension] = value === null ? null : String(value);
        }
        const metricValue = Number(source.metric);
        if (!Number.isFinite(metricValue)) {
          throw new Error('Unexpected aggregate result');
        }
        output.metric = metricValue;
        return output;
      });

      return {
        rows,
        sourceSql: compiled.sql,
        executedSql: compiled.sql,
        params: compiled.parameters,
      };
    },

    close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = db.destroy();
      }
      return closePromise;
    },
  };
}
