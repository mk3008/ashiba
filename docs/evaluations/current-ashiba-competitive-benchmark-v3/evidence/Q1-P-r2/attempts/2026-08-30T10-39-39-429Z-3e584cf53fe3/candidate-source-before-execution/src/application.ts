import postgres from '@prisma/orm-postgres/runtime';
import { defineContract } from '@prisma/orm-postgres/contract-builder';

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

const contract = defineContract({});

const sourceSql = `WITH ranked_orders AS (
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
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.state = 'paid'::order_state
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

const resultRow = {
  customer_id: 'pg/text@1',
  display_name: 'pg/text@1',
  region: 'pg/text@1',
  has_requested_tag: 'pg/bool@1',
  paid_order_count: 'pg/text@1',
  paid_total_cents: 'pg/text@1',
  latest_order_cents: { codecId: 'pg/text@1', nullable: true },
  value_band: 'pg/text@1',
} as const;

function closedError(): ApplicationError {
  const error = new Error('Application is closed') as ApplicationError;
  error.code = 'APPLICATION_CLOSED';
  return error;
}

export function createApplication(runtime: Runtime): Application {
  // The runner gives the candidate role a nonce-schema search_path. Keeping
  // identifiers unqualified makes the task query parameter-safe without
  // turning the runtime schema name into SQL syntax.
  void runtime.schema;

  const db = postgres({ contract, url: runtime.connectionString });
  let closed = false;

  function assertOpen(): void {
    if (closed) {
      throw closedError();
    }
  }

  function buildTask(input: InvestigationInput) {
    return db.raw.sql`WITH ranked_orders AS (
  SELECT
    c.customer_id,
    c.display_name,
    c.region,
    c.tags @> ARRAY[${input.requestedTag}::text]::text[] AS has_requested_tag,
    o.order_id,
    o.total_cents::bigint AS total_cents,
    ROW_NUMBER() OVER (
      PARTITION BY c.customer_id
      ORDER BY o.created_at DESC, o.order_id DESC
    ) AS order_rank
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.state = 'paid'::order_state
  WHERE c.profile->>'tier' = ${input.tier}::text
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
ORDER BY paid_total_cents DESC, customer_id ASC`.returnsRow(resultRow);
  }

  return {
    async investigate(input): Promise<InvestigationResult> {
      assertOpen();
      const rows = await db.runtime().query(buildTask(input).build());
      return {
        rows,
        sourceSql,
        executedSql: sourceSql,
        params: [input.requestedTag, input.tier],
      };
    },

    async explain(input): Promise<ExplanationResult> {
      assertOpen();
      const task = buildTask(input);
      const explanation = db.raw.sql`EXPLAIN (FORMAT JSON) ${task}`
        .returnsRow({ 'QUERY PLAN': 'pg/json@1' })
        .build();
      const rows = await db.runtime().query(explanation);
      const plan = rows[0]?.['QUERY PLAN'];
      return {
        sourceSql,
        executedSql: sourceSql,
        params: [input.requestedTag, input.tier],
        plan,
      };
    },

    async close(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      await db.close();
    },
  };
}
