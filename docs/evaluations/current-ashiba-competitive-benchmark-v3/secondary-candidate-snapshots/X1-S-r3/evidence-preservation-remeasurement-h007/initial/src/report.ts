import { Pool } from 'pg';
import { listStatusAssigneePriority, listStatusAssigneePriorityQuery, listStatusCounts, listStatusCountsQuery, listTagStatusCount, listTagStatusCountQuery } from './generated/query_sql.js';

type Dimension = 'status' | 'assignee' | 'tag';
type Metric = 'count' | 'priorityTotal';
type Request = { dimensions: readonly Dimension[]; metric: Metric; includeTagJoin: boolean; statuses?: readonly ('open' | 'pending' | 'closed')[]; requestedTag?: string };
type Runtime = { connectionString: string; schema: string };
class ValidationError extends Error { code = 'VALIDATION' as const; }
const invalid = (message: string): never => { throw new ValidationError(message); };
const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
function validate(input: Request) {
  if (!Array.isArray(input.dimensions) || input.dimensions.length === 0 || new Set(input.dimensions).size !== input.dimensions.length) invalid('dimensions must be a non-empty unique list');
  if (!input.dimensions.every((dimension) => ['status', 'assignee', 'tag'].includes(dimension))) invalid('unknown dimension');
  if (input.dimensions.includes('tag') && !input.includeTagJoin) invalid('tag requires includeTagJoin');
  if (input.metric !== 'count' && input.metric !== 'priorityTotal') invalid('unknown metric');
  if (input.statuses && (!input.statuses.length || !input.statuses.every((status) => ['open', 'pending', 'closed'].includes(status)))) invalid('invalid status');
}
export function createReportApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const schema = quoteIdentifier(runtime.schema);
  let closed = false;
  return {
    async runReport(input: Request) {
      validate(input);
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO ${schema}`);
        if (input.dimensions.join(',') === 'status' && input.metric === 'count' && !input.includeTagJoin && !input.statuses && input.requestedTag === undefined) {
          return { rows: await listStatusCounts(client), sourceSql: listStatusCountsQuery, executedSql: listStatusCountsQuery, params: [] };
        }
        if (input.dimensions.join(',') === 'status,assignee' && input.metric === 'priorityTotal' && !input.includeTagJoin && input.statuses && input.requestedTag === undefined) {
          return { rows: await listStatusAssigneePriority(client, { statuses: [...input.statuses] }), sourceSql: listStatusAssigneePriorityQuery, executedSql: listStatusAssigneePriorityQuery, params: [input.statuses] };
        }
        if (input.dimensions.join(',') === 'tag,status' && input.metric === 'count' && input.includeTagJoin && input.requestedTag !== undefined) {
          return { rows: await listTagStatusCount(client, { requestedTag: input.requestedTag }), sourceSql: listTagStatusCountQuery, executedSql: listTagStatusCountQuery, params: [input.requestedTag] };
        }
        invalid('request shape is not in the generated report vocabulary');
      } finally { client.release(); }
    },
    async close() { if (!closed) { closed = true; await pool.end(); } },
  };
}
