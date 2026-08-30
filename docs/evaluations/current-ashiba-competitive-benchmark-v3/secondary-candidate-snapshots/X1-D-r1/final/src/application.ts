import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
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

class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

const DIMENSIONS = new Set<Dimension>(['status', 'assignee', 'tag']);
const METRICS = new Set<Metric>(['count', 'priorityTotal']);
const STATUSES = new Set(['open', 'pending', 'closed']);

function validation(message: string): never {
  throw new ApplicationError('VALIDATION', message);
}

function validateRequest(input: ReportRequest): void {
  if (!input || !Array.isArray(input.dimensions) || input.dimensions.length === 0) {
    validation('dimensions must be a non-empty array');
  }
  if (new Set(input.dimensions).size !== input.dimensions.length || !input.dimensions.every((item) => DIMENSIONS.has(item))) {
    validation('dimensions must be unique supported dimensions');
  }
  if (!METRICS.has(input.metric)) validation('metric is not supported');
  if (typeof input.includeTagJoin !== 'boolean') validation('includeTagJoin must be a boolean');
  if (input.dimensions.includes('tag') && !input.includeTagJoin) {
    validation('tag dimension requires includeTagJoin');
  }
  if (input.requestedTag !== undefined && typeof input.requestedTag !== 'string') {
    validation('requestedTag must be a string');
  }
  if (input.requestedTag !== undefined && !input.includeTagJoin) {
    validation('requestedTag requires includeTagJoin');
  }
  if (input.statuses !== undefined && (!Array.isArray(input.statuses) || !input.statuses.every((status) => STATUSES.has(status)))) {
    validation('statuses contains an unsupported status');
  }
}

/**
 * All query structure below comes from finite source-controlled mappings.
 * Request values are represented as bound Drizzle SQL parameters.
 */
export function createReportApplication(runtime: Runtime): ReportApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle({ client: pool });
  const tickets = sql`${sql.identifier(runtime.schema)}.${sql.identifier('tickets')}`;
  const ticketTags = sql`${sql.identifier(runtime.schema)}.${sql.identifier('ticket_tags')}`;
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const ensureOpen = (): void => {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED', 'application is closed');
  };

  return {
    async runReport(input: ReportRequest): Promise<ReportResult> {
      ensureOpen();
      validateRequest(input);

      const dimensionExpressions: Record<Dimension, SQL> = {
        status: sql`${tickets}.status`,
        assignee: sql`${tickets}.assignee`,
        tag: sql`${ticketTags}.tag`,
      };
      const selectedDimensions = input.dimensions.map((dimension) =>
        sql`${dimensionExpressions[dimension]} as ${sql.identifier(dimension)}`,
      );
      const metricExpression = input.metric === 'count'
        // A tag join can yield several tag rows for one ticket.  The report's
        // count is explicitly a grouped ticket count, not a joined-row count.
        ? sql<number>`count(distinct ${tickets}.id) as ${sql.identifier('metric')}`
        : sql<number>`coalesce(sum(${tickets}.priority), 0) as ${sql.identifier('metric')}`;
      const predicates: SQL[] = [];

      if (input.statuses && input.statuses.length > 0) {
        const statusValues = input.statuses.map((status) => sql`${status}`);
        predicates.push(sql`${tickets}.status in (${sql.join(statusValues, sql`, `)})`);
      }
      if (input.requestedTag !== undefined) {
        predicates.push(sql`${ticketTags}.tag = ${input.requestedTag}`);
      }

      const join = input.includeTagJoin
        ? sql` inner join ${ticketTags} on ${ticketTags}.ticket_id = ${tickets}.id`
        : sql``;
      const where = predicates.length > 0 ? sql` where ${sql.join(predicates, sql` and `)}` : sql``;
      const groups = input.dimensions.map((dimension) => dimensionExpressions[dimension]);
      const ordering = input.dimensions.map((dimension) => sql`${dimensionExpressions[dimension]} asc nulls last`);

      const query = sql`
        select ${sql.join(selectedDimensions, sql`, `)}, ${metricExpression}
        from ${tickets}${join}${where}
        group by ${sql.join(groups, sql`, `)}
        order by ${sql.join(ordering, sql`, `)}
      `;
      const compiled = new PgDialect().sqlToQuery(query);
      const result = await db.execute(query);
      const rows = (result.rows as Record<string, unknown>[]).map((row) => {
        const normalized: Record<string, string | number | null> = {};
        for (const dimension of input.dimensions) {
          const value = row[dimension];
          normalized[dimension] = value === null ? null : String(value);
        }
        const metric = row.metric;
        normalized.metric = typeof metric === 'number' ? metric : Number(metric);
        return normalized;
      });

      return { rows, sourceSql: compiled.sql, executedSql: compiled.sql, params: compiled.params };
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

export const createApplication = createReportApplication;
