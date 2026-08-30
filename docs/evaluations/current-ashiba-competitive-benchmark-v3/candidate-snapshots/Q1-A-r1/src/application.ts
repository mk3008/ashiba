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

class CandidateError extends Error implements ApplicationError {
  public readonly code: ApplicationError['code'];

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

/*
 * This is canonical, reviewable PostgreSQL SQL. The schema token is replaced
 * only with the runtime-provided, validated schema identifier; data values stay
 * as Ashiba named parameters and are never interpolated into SQL text.
 */
const CANONICAL_SQL = `WITH ranked_orders AS (
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
ORDER BY paid_total_cents DESC, customer_id ASC;`;

function materializeSchema(sql: string, schema: string): string {
  // PostgreSQL parameters cannot represent identifiers. The runner provides a
  // nonce schema, so accept precisely ordinary unquoted PostgreSQL identifiers.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new CandidateError('VALIDATION', 'runtime schema must be an unquoted PostgreSQL identifier');
  }

  return sql.replaceAll('{{schema}}', schema);
}

function checkedParameters(input: { requestedTag: string; tier: string }): Record<string, string> {
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof input.requestedTag !== 'string' ||
    typeof input.tier !== 'string'
  ) {
    throw new CandidateError('VALIDATION', 'requestedTag and tier must be strings');
  }

  return { requestedTag: input.requestedTag, tier: input.tier };
}

export function createApplication(runtime: Runtime): Application {
  if (
    runtime === null ||
    typeof runtime !== 'object' ||
    typeof runtime.connectionString !== 'string' ||
    typeof runtime.schema !== 'string'
  ) {
    throw new CandidateError('VALIDATION', 'runtime must include a connection string and schema');
  }

  // Report the stable canonical source (including its schema token). Only the
  // compiled SQL is materialized for this runtime's nonce schema and sent to
  // PostgreSQL. This preserves a direct source -> compiled/executed lineage.
  const sourceSql = CANONICAL_SQL;
  const prepared = compileNamedParameters(sourceSql, { canonicalSyntax: 'colon' });
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closePromise: Promise<void> | undefined;

  const assertOpen = (): void => {
    if (closePromise !== undefined) {
      throw new CandidateError('APPLICATION_CLOSED', 'application is closed');
    }
  };

  const bind = (input: { requestedTag: string; tier: string }) => {
    const parameters = checkedParameters(input);
    const bound = bindNamedParameters(prepared, parameters);
    const values = bound.values.map((value): string => {
      if (typeof value !== 'string') {
        throw new CandidateError('VALIDATION', 'query parameters must be strings');
      }
      return value;
    });
    return {
      executedSql: materializeSchema(bound.sql, runtime.schema),
      // This workload's declared values are strings. Convert only the bound
      // values, so the driver receives exactly the compiler/binder output.
      values,
      // Report the exact sequence produced by the Ashiba binder, rather than
      // a parallel reconstruction from the input object.
      params: values,
    };
  };

  return {
    async investigate(input): Promise<InvestigationResult> {
      assertOpen();
      const query = bind(input);
      const result = await pool.query(query.executedSql, query.values);
      return {
        rows: result.rows,
        sourceSql,
        executedSql: query.executedSql,
        params: query.params,
      };
    },

    async explain(input): Promise<ExplainResult> {
      assertOpen();
      const query = bind(input);
      // Keep the evidence statement derived from the same compiled SQL that
      // investigate reports and executes. The returned executedSql remains the
      // task query, allowing both operations' metadata to compare directly.
      const explainSql = `EXPLAIN (FORMAT JSON) ${query.executedSql}`;
      const result = await pool.query(explainSql, query.values);
      const plan = result.rows[0]?.['QUERY PLAN'];
      if (!Array.isArray(plan) || plan.length === 0 || typeof plan[0]?.Plan !== 'object') {
        throw new Error('PostgreSQL EXPLAIN (FORMAT JSON) did not return a plan');
      }
      return {
        sourceSql,
        executedSql: query.executedSql,
        params: query.params,
        plan,
      };
    },

    close(): Promise<void> {
      closePromise ??= pool.end();
      return closePromise;
    },
  };
}
