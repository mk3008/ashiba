import { defineContract } from '@prisma/orm-postgres/contract-builder';
import postgres from '@prisma/orm-postgres/runtime';

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

type TicketStatus = 'open' | 'pending' | 'closed';
type ValidatedRequest = {
  dimensions: readonly Dimension[];
  metric: Metric;
  includeTagJoin: boolean;
  statuses: readonly TicketStatus[] | undefined;
  requestedTag: string | undefined;
};

const DIMENSIONS: Readonly<Record<Dimension, { readonly expression: string; readonly codecId: 'pg/text@1' }>> = {
  status: { expression: '"tickets"."status"::text', codecId: 'pg/text@1' },
  assignee: { expression: '"tickets"."assignee"', codecId: 'pg/text@1' },
  tag: { expression: '"ticket_tags"."tag"', codecId: 'pg/text@1' },
};

const METRICS: Readonly<Record<Metric, { readonly expression: string; readonly codecId: 'pg/int4@1' }>> = {
  count: { expression: 'COUNT("tickets"."id")::integer', codecId: 'pg/int4@1' },
  priorityTotal: { expression: 'SUM("tickets"."priority")::integer', codecId: 'pg/int4@1' },
};

const STATUSES = new Set<TicketStatus>(['open', 'pending', 'closed']);

class CodedError extends Error {
  readonly code: 'VALIDATION' | 'APPLICATION_CLOSED';

  constructor(code: 'VALIDATION' | 'APPLICATION_CLOSED', message: string) {
    super(message);
    this.code = code;
  }
}

function validationError(): never {
  throw new CodedError('VALIDATION', 'Invalid report request');
}

function validateRequest(input: unknown): ValidatedRequest {
  if (input === null || typeof input !== 'object') validationError();

  const candidate = input as Partial<ReportRequest>;
  if (!Array.isArray(candidate.dimensions) || candidate.dimensions.length === 0) validationError();
  if (candidate.includeTagJoin !== true && candidate.includeTagJoin !== false) validationError();
  if (candidate.metric !== 'count' && candidate.metric !== 'priorityTotal') validationError();

  const dimensions = candidate.dimensions as readonly unknown[];
  const seen = new Set<Dimension>();
  for (const dimension of dimensions) {
    if (dimension !== 'status' && dimension !== 'assignee' && dimension !== 'tag') validationError();
    if (seen.has(dimension)) validationError();
    seen.add(dimension);
  }

  if (!candidate.includeTagJoin && seen.has('tag')) validationError();
  if (candidate.requestedTag !== undefined && typeof candidate.requestedTag !== 'string') validationError();
  if (!candidate.includeTagJoin && candidate.requestedTag !== undefined) validationError();

  let statuses: readonly TicketStatus[] | undefined;
  if (candidate.statuses !== undefined) {
    if (!Array.isArray(candidate.statuses)) validationError();
    for (const status of candidate.statuses) {
      if (typeof status !== 'string' || !STATUSES.has(status as TicketStatus)) validationError();
    }
    statuses = candidate.statuses as readonly TicketStatus[];
  }

  return {
    dimensions: dimensions as readonly Dimension[],
    metric: candidate.metric,
    includeTagJoin: candidate.includeTagJoin,
    statuses,
    requestedTag: candidate.requestedTag,
  };
}

function asTemplateStrings(parts: readonly string[]): TemplateStringsArray {
  return Object.assign([...parts], { raw: [...parts] }) as unknown as TemplateStringsArray;
}

function buildStatement(input: ValidatedRequest) {
  const projection = input.dimensions
    .map((dimension) => `${DIMENSIONS[dimension].expression} AS "${dimension}"`)
    .concat(`${METRICS[input.metric].expression} AS "metric"`)
    .join(', ');
  const groupBy = input.dimensions.map((dimension) => DIMENSIONS[dimension].expression).join(', ');
  const orderBy = input.dimensions.map((dimension) => `"${dimension}" ASC NULLS LAST`).join(', ');
  const join = input.includeTagJoin
    ? ' INNER JOIN "ticket_tags" ON "ticket_tags"."ticket_id" = "tickets"."id"'
    : '';

  const parts = [`SELECT ${projection} FROM "tickets"${join}`];
  const params: string[] = [];
  const sourcePredicates: string[] = [];

  const appendParam = (value: string, prefix: string, suffix: string): void => {
    parts[parts.length - 1] += prefix;
    params.push(value);
    parts.push(suffix);
  };

  if (input.statuses !== undefined) {
    if (input.statuses.length === 0) {
      sourcePredicates.push('FALSE');
      parts[parts.length - 1] += ' WHERE FALSE';
    } else {
      const parameterOffset = params.length + 1;
      sourcePredicates.push(
        `"tickets"."status" IN (${input.statuses.map((_, index) => `$${parameterOffset + index}::ticket_status`).join(', ')})`,
      );
      for (const [index, status] of input.statuses.entries()) {
        appendParam(status, index === 0 ? ' WHERE "tickets"."status" IN (' : ', ', '::ticket_status');
      }
      parts[parts.length - 1] += ')';
    }
  }

  if (input.requestedTag !== undefined) {
    const parameterNumber = params.length + 1;
    sourcePredicates.push(`"ticket_tags"."tag" = $${parameterNumber}::text`);
    appendParam(
      input.requestedTag,
      sourcePredicates.length === 1 ? ' WHERE "ticket_tags"."tag" = ' : ' AND "ticket_tags"."tag" = ',
      '::text',
    );
  }

  const predicateSql = sourcePredicates.length === 0 ? '' : ` WHERE ${sourcePredicates.join(' AND ')}`;
  const sourceSql = `SELECT ${projection} FROM "tickets"${join}${predicateSql} GROUP BY ${groupBy} ORDER BY ${orderBy}`;
  parts[parts.length - 1] += ` GROUP BY ${groupBy} ORDER BY ${orderBy}`;

  const rowSpec: Record<string, { codecId: 'pg/text@1' | 'pg/int4@1'; nullable?: boolean }> = {
    metric: { codecId: METRICS[input.metric].codecId },
  };
  for (const dimension of input.dimensions) {
    rowSpec[dimension] = {
      codecId: DIMENSIONS[dimension].codecId,
      nullable: dimension === 'assignee',
    };
  }

  return { parts, params, rowSpec, sourceSql };
}

function normaliseRows(rows: readonly unknown[], dimensions: readonly Dimension[]): Record<string, string | number | null>[] {
  return rows.map((rawRow) => {
    if (rawRow === null || typeof rawRow !== 'object') {
      throw new Error('Prisma returned an invalid report row');
    }
    const row = rawRow as Record<string, unknown>;
    const result: Record<string, string | number | null> = {};
    for (const dimension of dimensions) {
      const value = row[dimension];
      if (value !== null && typeof value !== 'string') {
        throw new Error('Prisma returned an invalid report dimension');
      }
      result[dimension] = value;
    }
    if (typeof row.metric !== 'number') {
      throw new Error('Prisma returned an invalid report metric');
    }
    result.metric = row.metric;
    return result;
  });
}

// The report shape needs an optional junction-table join and runtime-selected
// grouping columns. Prisma 8 RC's documented raw lane is used for this
// PostgreSQL-specific aggregate while all values remain bound parameters.
const reportContract = defineContract(
  { models: {} },
);

export function createReportApplication(runtime: Runtime): ReportApplication {
  const db = postgres({ contract: reportContract, url: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async runReport(input: ReportRequest): Promise<ReportResult> {
      if (closed) {
        throw new CodedError('APPLICATION_CLOSED', 'Report application is closed');
      }

      const request = validateRequest(input);
      const statement = buildStatement(request);
      const plan = db.raw
        .sql(asTemplateStrings(statement.parts), ...statement.params)
        .returnsRow(statement.rowSpec)
        .build();
      const rawRows = await db.runtime().query(plan);
      const rows = normaliseRows(rawRows as unknown as readonly unknown[], request.dimensions);

      return {
        rows,
        sourceSql: statement.sourceSql,
        executedSql: statement.sourceSql,
        params: statement.params,
      };
    },

    async close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = db.close();
      }
      await closePromise;
    },
  };
}
