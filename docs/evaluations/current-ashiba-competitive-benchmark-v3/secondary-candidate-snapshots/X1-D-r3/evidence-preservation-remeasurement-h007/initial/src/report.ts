import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, type SQL } from 'drizzle-orm';
import { Pool } from 'pg';

type Dimension = 'status' | 'assignee' | 'tag';
type Metric = 'count' | 'priorityTotal';
type Request = { dimensions: readonly Dimension[]; metric: Metric; includeTagJoin: boolean; statuses?: readonly ('open' | 'pending' | 'closed')[]; requestedTag?: string };
type Runtime = { connectionString: string; schema: string };

class ValidationError extends Error { code = 'VALIDATION' as const; }
const invalid = (message: string): never => { throw new ValidationError(message); };
const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const dimensions: Record<Dimension, string> = { status: 't.status::text', assignee: 't.assignee', tag: 'tt.tag' };
function validate(input: Request) {
  if (!Array.isArray(input.dimensions) || input.dimensions.length === 0 || new Set(input.dimensions).size !== input.dimensions.length) invalid('dimensions must be a non-empty unique list');
  if (!input.dimensions.every((dimension) => dimension in dimensions)) invalid('unknown dimension');
  if (input.dimensions.includes('tag') && !input.includeTagJoin) invalid('tag requires includeTagJoin');
  if (input.metric !== 'count' && input.metric !== 'priorityTotal') invalid('unknown metric');
  if (input.statuses && (!input.statuses.length || !input.statuses.every((status) => ['open', 'pending', 'closed'].includes(status)))) invalid('invalid status');
}

export function createReportApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle(pool);
  const schema = quoteIdentifier(runtime.schema);
  let closed = false;
  return {
    async runReport(input: Request) {
      validate(input);
      const params: unknown[] = [];
      const projection = input.dimensions.map((dimension) => `${dimensions[dimension]} AS "${dimension}"`).join(', ');
      const metric = input.metric === 'count' ? 'COUNT(*)::int' : 'COALESCE(SUM(t.priority), 0)::int';
      const joins = input.includeTagJoin ? ` JOIN ${schema}.ticket_tags tt ON tt.ticket_id = t.id` : '';
      const prefix = `SELECT ${projection}, ${metric} AS "metric" FROM ${schema}.tickets t${joins}`;
      const filters: string[] = [];
      const chunks: SQL[] = [sql.raw(prefix)];
      if (input.statuses?.length) { filters.push(`t.status::text = ANY($${params.length + 1}::text[])`); params.push(input.statuses); }
      if (input.requestedTag !== undefined) { filters.push(`tt.tag = $${params.length + 1}`); params.push(input.requestedTag); }
      if (filters.length) {
        if (input.statuses?.length) { chunks.push(sql.raw(' WHERE t.status::text = ANY('), sql`${input.statuses}`, sql.raw('::text[])')); }
        if (input.requestedTag !== undefined) chunks.push(sql.raw(input.statuses?.length ? ' AND tt.tag = ' : ' WHERE tt.tag = '), sql`${input.requestedTag}`);
      }
      const groups = input.dimensions.map((dimension) => dimensions[dimension]).join(', ');
      const ordering = input.dimensions.map((dimension) => `${dimensions[dimension]} ASC NULLS LAST`).join(', ');
      chunks.push(sql.raw(` GROUP BY ${groups} ORDER BY ${ordering}`));
      const result = await db.execute(sql.join(chunks, sql.raw('')));
      const sourceSql = `${prefix}${filters.length ? ` WHERE ${filters.join(' AND ')}` : ''} GROUP BY ${groups} ORDER BY ${ordering}`;
      return { rows: result.rows, sourceSql, executedSql: sourceSql, params };
    },
    async close() { if (!closed) { closed = true; await pool.end(); } },
  };
}
