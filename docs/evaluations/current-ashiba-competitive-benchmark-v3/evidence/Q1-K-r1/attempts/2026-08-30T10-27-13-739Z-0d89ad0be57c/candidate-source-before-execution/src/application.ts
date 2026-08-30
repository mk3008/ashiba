import { Kysely, PostgresDialect, sql } from 'kysely';
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

export interface ExplanationResult {
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
  plan: unknown;
}

export interface Application {
  investigate(input: { requestedTag: string; tier: string }): Promise<InvestigationResult>;
  explain(input: { requestedTag: string; tier: string }): Promise<ExplanationResult>;
  close(): Promise<void>;
}

interface Database {}

interface InvestigationRow {
  customer_id: string;
  display_name: string;
  region: string;
  has_requested_tag: boolean;
  paid_order_count: string;
  paid_total_cents: string;
  latest_order_cents: string | null;
  value_band: 'high' | 'normal' | 'none';
}

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function requireQueryInput(input: { requestedTag: string; tier: string }): void {
  if (typeof input?.requestedTag !== 'string' || typeof input?.tier !== 'string') {
    throw applicationError('VALIDATION', 'requestedTag and tier must be strings');
  }
}

/**
 * The Kysely PostgreSQL dialect owns the connection lifecycle and compiles the
 * parameterized task query. Runtime schema names use sql.id() and therefore
 * remain SQL identifiers instead of interpolated SQL text.
 */
export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  const schema = sql.id(runtime.schema);
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const taskQuery = (requestedTag: string, tier: string) => sql<InvestigationRow>`
    WITH ranked_orders AS (
      SELECT
        c.customer_id,
        c.display_name,
        c.region,
        c.tags @> ARRAY[${requestedTag}::text]::text[] AS has_requested_tag,
        o.order_id,
        o.total_cents::bigint AS total_cents,
        ROW_NUMBER() OVER (
          PARTITION BY c.customer_id
          ORDER BY o.created_at DESC, o.order_id DESC
        ) AS order_rank
      FROM ${schema}.${sql.id('customers')} AS c
      LEFT JOIN ${schema}.${sql.id('orders')} AS o
        ON o.customer_id = c.customer_id
       AND o.state = 'paid'::${schema}.${sql.id('order_state')}
      WHERE c.profile->>'tier' = ${tier}::text
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
    ORDER BY paid_total_cents DESC, customer_id ASC
  `;

  function ensureOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  function compileTask(input: { requestedTag: string; tier: string }) {
    requireQueryInput(input);
    ensureOpen();
    return taskQuery(input.requestedTag, input.tier).compile(db);
  }

  return {
    async investigate(input): Promise<InvestigationResult> {
      const compiled = compileTask(input);
      const result = await db.executeQuery(compiled);
      return {
        rows: result.rows,
        sourceSql: compiled.sql,
        executedSql: compiled.sql,
        params: compiled.parameters.map(String),
      };
    },

    async explain(input): Promise<ExplanationResult> {
      const compiled = compileTask(input);
      const explainQuery = sql<{ 'QUERY PLAN': unknown }>`EXPLAIN (FORMAT JSON) ${taskQuery(
        input.requestedTag,
        input.tier,
      )}`.compile(db);
      const result = await db.executeQuery(explainQuery);
      const firstRow = result.rows[0];

      return {
        sourceSql: compiled.sql,
        executedSql: compiled.sql,
        params: compiled.parameters.map(String),
        plan: firstRow?.['QUERY PLAN'],
      };
    },

    close(): Promise<void> {
      if (!closePromise) {
        closed = true;
        closePromise = db.destroy();
      }
      return closePromise;
    },
  };
}
