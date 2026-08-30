import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'APPLICATION_CLOSED';
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

type QueryInput = {
  requestedTag: string;
  tier: string;
};

type ExplainRow = {
  'QUERY PLAN': unknown;
};

const postgresIdentifier = /^[A-Za-z_][A-Za-z0-9_$]*$/;

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateRuntime(runtime: Runtime): void {
  if (!postgresIdentifier.test(runtime.schema)) {
    throw applicationError('VALIDATION', 'runtime.schema must be a PostgreSQL identifier');
  }
}

function validateInput(input: QueryInput): void {
  if (typeof input?.requestedTag !== 'string' || typeof input?.tier !== 'string') {
    throw applicationError('VALIDATION', 'requestedTag and tier must be strings');
  }
}

function buildInvestigationQuery(runtime: Runtime, input: QueryInput) {
  const schema = sql.identifier(runtime.schema);
  const customers = sql`${schema}.${sql.identifier('customers')}`;
  const orders = sql`${schema}.${sql.identifier('orders')}`;
  const orderState = sql`${schema}.${sql.identifier('order_state')}`;

  return sql`
    WITH ranked_orders AS (
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
      FROM ${customers} AS c
      LEFT JOIN ${orders} AS o
        ON o.customer_id = c.customer_id
       AND o.state = 'paid'::${orderState}
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
    ORDER BY paid_total_cents DESC, customer_id ASC;
  `;
}

export function createApplication(runtime: Runtime): Application {
  validateRuntime(runtime);

  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle({ client: pool });
  const dialect = new PgDialect();
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  function preparedQuery(input: QueryInput) {
    validateInput(input);
    const statement = buildInvestigationQuery(runtime, input);
    const compiled = dialect.sqlToQuery(statement);

    return {
      statement,
      sourceSql: compiled.sql,
      executedSql: compiled.sql,
      params: compiled.params.map((value) => String(value)),
    };
  }

  return {
    async investigate(input) {
      ensureOpen();
      const query = preparedQuery(input);
      const result = await db.execute<Record<string, unknown>>(query.statement);

      return {
        rows: result.rows,
        sourceSql: query.sourceSql,
        executedSql: query.executedSql,
        params: query.params,
      };
    },

    async explain(input) {
      ensureOpen();
      const query = preparedQuery(input);
      const result = await db.execute<ExplainRow>(sql`EXPLAIN (FORMAT JSON) ${query.statement}`);
      const plan = result.rows[0]?.['QUERY PLAN'];

      if (plan === undefined) {
        throw new Error('PostgreSQL returned no JSON plan');
      }

      return {
        sourceSql: query.sourceSql,
        executedSql: query.executedSql,
        params: query.params,
        plan,
      };
    },

    async close() {
      if (!closePromise) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
