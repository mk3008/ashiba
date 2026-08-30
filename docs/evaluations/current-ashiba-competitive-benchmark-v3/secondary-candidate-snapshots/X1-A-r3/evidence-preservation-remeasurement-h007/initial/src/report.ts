import { Pool } from 'pg';
import { bindNamedParameters, type ParameterBinding } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

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
  const schema = quoteIdentifier(runtime.schema);
  const compiled = new Map();
  let closed = false;
  return {
    async runReport(input: Request) {
      validate(input);
      const projection = input.dimensions.map((dimension) => `${dimensions[dimension]} AS "${dimension}"`).join(', ');
      const metric = input.metric === 'count' ? 'COUNT(*)::int' : 'COALESCE(SUM(t.priority), 0)::int';
      const joins = input.includeTagJoin ? ` JOIN ${schema}.ticket_tags tt ON tt.ticket_id = t.id` : '';
      const filters: string[] = [];
      const values: Record<string, unknown> = {};
      if (input.statuses?.length) { filters.push('t.status::text = ANY(:statuses::text[])'); values.statuses = input.statuses; }
      if (input.requestedTag !== undefined) { filters.push('tt.tag = :requestedTag'); values.requestedTag = input.requestedTag; }
      const groups = input.dimensions.map((dimension) => dimensions[dimension]).join(', ');
      const ordering = input.dimensions.map((dimension) => `${dimensions[dimension]} ASC NULLS LAST`).join(', ');
      const sourceSql = `SELECT ${projection}, ${metric} AS "metric" FROM ${schema}.tickets t${joins}${filters.length ? ` WHERE ${filters.join(' AND ')}` : ''} GROUP BY ${groups} ORDER BY ${ordering}`;
      const statement = compiled.get(sourceSql) ?? compileNamedParameters(sourceSql);
      compiled.set(sourceSql, statement);
      const bound = bindNamedParameters(statement, values);
      const result = await pool.query(bound.sql, [...bound.values]);
      return { rows: result.rows, sourceSql, executedSql: bound.sql, params: bound.values };
    },
    async close() { if (!closed) { closed = true; await pool.end(); } },
  };
}
