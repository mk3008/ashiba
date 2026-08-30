import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import { Pool } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface InvestigationResult {
  rows: unknown[];
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
}

export interface ExplainResult {
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
  plan: unknown;
}

export interface Application {
  investigate(input: { requestedTag: string; tier: string }): Promise<InvestigationResult>;
  explain(input: { requestedTag: string; tier: string }): Promise<ExplainResult>;
  close(): Promise<void>;
}

const CANONICAL_SQL = `
WITH ranked_orders AS (
  SELECT
    c.customer_id,
    c.display_name,
    c.region,
    c.tags @> ARRAY[:requestedTag::text]::text[] AS has_requested_tag,
    o.order_id,
    o.total_cents::bigint AS total_cents,
    ROW_NUMBER() OVER (
      PARTITION BY c.customer_id
      ORDER BY o.created_at DESC, o.order_id DESC
    ) AS order_rank
  FROM {{schema}}.customers AS c
  LEFT JOIN {{schema}}.orders AS o
    ON o.customer_id = c.customer_id
   AND o.state = 'paid'::{{schema}}.order_state
  WHERE c.profile->>'tier' = :tier::text
), summary AS (
  SELECT
    customer_id,
    display_name,
    region,
    has_requested_tag,
    COUNT(order_id)::bigint AS paid_order_count,
    COALESCE(SUM(total_cents), 0)::bigint AS paid_total_cents,
    MAX(total_cents) FILTER (WHERE order_rank = 1)::bigint AS latest_order_cents
  FROM ranked_orders
  GROUP BY customer_id, display_name, region, has_requested_tag
)
SELECT
  customer_id::text AS customer_id,
  display_name,
  region,
  has_requested_tag,
  paid_order_count::text AS paid_order_count,
  paid_total_cents::text AS paid_total_cents,
  latest_order_cents::text AS latest_order_cents,
  CASE
    WHEN paid_total_cents >= 5000 THEN 'high'
    WHEN paid_total_cents > 0 THEN 'normal'
    ELSE 'none'
  END AS value_band
FROM summary
ORDER BY paid_total_cents DESC, customer_id ASC;
`;

function schemaIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw applicationError('VALIDATION', 'schema must be an unquoted PostgreSQL identifier');
  }
  return identifier;
}

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function assertQueryInput(input: { requestedTag: string; tier: string }): void {
  if (typeof input.requestedTag !== 'string' || typeof input.tier !== 'string') {
    throw applicationError('VALIDATION', 'requestedTag and tier must be strings');
  }
}

export function createApplication(runtime: Runtime): Application {
  const schema = schemaIdentifier(runtime.schema);
  const sourceSql = CANONICAL_SQL.replaceAll('{{schema}}', schema);
  const prepared = compileNamedParameters(sourceSql);
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  function bind(input: { requestedTag: string; tier: string }) {
    assertQueryInput(input);
    const bound = bindNamedParameters(prepared, input);
    return {
      sql: bound.sql,
      values: bound.values,
      params: bound.values.map((value) => String(value)),
    };
  }

  return {
    async investigate(input): Promise<InvestigationResult> {
      ensureOpen();
      const bound = bind(input);
      const result = await pool.query(bound.sql, bound.values as unknown[]);
      return { rows: result.rows, sourceSql, executedSql: bound.sql, params: bound.params };
    },

    async explain(input): Promise<ExplainResult> {
      ensureOpen();
      const bound = bind(input);
      const result = await pool.query(`EXPLAIN (FORMAT JSON) ${bound.sql}`, bound.values as unknown[]);
      return {
        sourceSql,
        executedSql: bound.sql,
        params: bound.params,
        plan: result.rows[0]?.['QUERY PLAN'],
      };
    },

    async close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
