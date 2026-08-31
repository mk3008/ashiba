import { Pool } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface InvestigationInput {
  requestedTag: string;
  tier: string;
}

export interface InvestigationResult {
  rows: unknown[];
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
}

export interface ExplanationResult {
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
  plan: unknown;
}

export interface Application {
  investigate(input: InvestigationInput): Promise<InvestigationResult>;
  explain(input: InvestigationInput): Promise<ExplanationResult>;
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

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function queryForSchema(schema: string): string {
  const namespace = quoteIdentifier(schema);

  return `WITH ranked_orders AS (
  SELECT
    c.customer_id,
    c.display_name,
    c.region,
    c.tags @> ARRAY[$1::text]::text[] AS has_requested_tag,
    o.order_id,
    o.total_cents::bigint AS total_cents,
    ROW_NUMBER() OVER (
      PARTITION BY c.customer_id
      ORDER BY o.created_at DESC, o.order_id DESC
    ) AS order_rank
  FROM ${namespace}.customers AS c
  LEFT JOIN ${namespace}.orders AS o
    ON o.customer_id = c.customer_id
   AND o.state = 'paid'::${namespace}.order_state
  WHERE c.profile->>'tier' = $2::text
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
}

function validateInput(input: InvestigationInput): string[] {
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof input.requestedTag !== 'string' ||
    typeof input.tier !== 'string'
  ) {
    throw new CandidateError('VALIDATION', 'requestedTag and tier must be strings');
  }

  return [input.requestedTag, input.tier];
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const sourceSql = queryForSchema(runtime.schema);
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function assertOpen(): void {
    if (closed) {
      throw new CandidateError('APPLICATION_CLOSED', 'Application has been closed');
    }
  }

  return {
    async investigate(input: InvestigationInput): Promise<InvestigationResult> {
      assertOpen();
      const params = validateInput(input);
      const result = await pool.query<Record<string, unknown>>(sourceSql, params);

      return {
        rows: result.rows,
        sourceSql,
        executedSql: sourceSql,
        params,
      };
    },

    async explain(input: InvestigationInput): Promise<ExplanationResult> {
      assertOpen();
      const params = validateInput(input);
      const result = await pool.query<Record<string, unknown>>(
        `EXPLAIN (FORMAT JSON) ${sourceSql}`,
        params,
      );

      return {
        sourceSql,
        executedSql: sourceSql,
        params,
        plan: result.rows[0]?.['QUERY PLAN'],
      };
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
