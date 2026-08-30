import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  investigate(input: {
    requestedTag: string;
    tier: string;
  }): Promise<{
    rows: unknown[];
    sourceSql: string;
    executedSql: string;
    params: readonly string[];
  }>;
  explain(input: {
    requestedTag: string;
    tier: string;
  }): Promise<{
    sourceSql: string;
    executedSql: string;
    params: readonly string[];
    plan: unknown;
  }>;
  close(): Promise<void>;
}

interface Database {}

class CandidateError extends Error implements ApplicationError {
  readonly code: ApplicationError['code'];

  constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

interface CompiledTaskQuery {
  sourceSql: string;
  params: readonly string[];
  query: ReturnType<typeof sql>;
}

function compileTaskQuery(
  db: Kysely<Database>,
  schema: string,
  requestedTag: string,
  tier: string,
): CompiledTaskQuery {
  // The nonce schema is supplied by the runner. sql.id keeps it an identifier,
  // while the two business inputs remain PostgreSQL parameters.
  const customers = sql.id(schema, 'customers');
  const orders = sql.id(schema, 'orders');
  const orderState = sql.id(schema, 'order_state');
  const query = sql`
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
      FROM ${customers} AS c
      LEFT JOIN ${orders} AS o
        ON o.customer_id = c.customer_id
       AND o.state = 'paid'::${orderState}
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
  const compiled = query.compile(db);

  return {
    query,
    sourceSql: compiled.sql,
    params: [requestedTag, tier],
  };
}

export function createApplication(runtime: Runtime): Application {
  // Kysely is configured with its PostgreSQL dialect over this runtime-scoped pool.
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
  let closing: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closing !== undefined) {
      throw new CandidateError('APPLICATION_CLOSED', 'Application has been closed');
    }
  }

  return {
    async investigate(input) {
      ensureOpen();
      const task = compileTaskQuery(db, runtime.schema, input.requestedTag, input.tier);
      const result = await task.query.execute(db);

      return {
        rows: result.rows,
        sourceSql: task.sourceSql,
        executedSql: task.sourceSql,
        params: task.params,
      };
    },

    async explain(input) {
      ensureOpen();
      const task = compileTaskQuery(db, runtime.schema, input.requestedTag, input.tier);
      const explain = sql<{ 'QUERY PLAN': unknown }>`EXPLAIN (FORMAT JSON) ${task.query}`;
      const result = await explain.execute(db);
      const plan = result.rows[0]?.['QUERY PLAN'];

      if (plan === undefined) {
        throw new Error('PostgreSQL did not return an EXPLAIN plan');
      }

      return {
        sourceSql: task.sourceSql,
        executedSql: task.sourceSql,
        params: task.params,
        plan,
      };
    },

    async close() {
      if (closing === undefined) {
        closing = db.destroy();
      }
      await closing;
    },
  };
}
