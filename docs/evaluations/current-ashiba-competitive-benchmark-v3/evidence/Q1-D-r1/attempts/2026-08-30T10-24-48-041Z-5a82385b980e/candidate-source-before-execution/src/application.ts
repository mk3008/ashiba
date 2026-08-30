import { drizzle } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import { Client } from 'pg';

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

class CandidateError extends Error implements ApplicationError {
  readonly code: ApplicationError['code'];

  constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

function validateInput(input: { requestedTag: string; tier: string }): void {
  if (typeof input?.requestedTag !== 'string' || typeof input?.tier !== 'string') {
    throw new CandidateError('VALIDATION', 'requestedTag and tier must be strings');
  }
}

function makeTaskQuery(schema: string, requestedTag: string, tier: string): SQL {
  const namespace = sql.identifier(schema);

  return sql`
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
      FROM ${namespace}.customers AS c
      LEFT JOIN ${namespace}.orders AS o
        ON o.customer_id = c.customer_id
       AND o.state = 'paid'::${namespace}.order_state
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
}

export function createApplication(runtime: Runtime): Application {
  const client = new Client({ connectionString: runtime.connectionString });
  const db = drizzle(client);
  const dialect = new PgDialect();
  let closed = false;
  let connected: Promise<void> | undefined;

  const ensureOpen = async (): Promise<void> => {
    if (closed) {
      throw new CandidateError('APPLICATION_CLOSED', 'application is closed');
    }
    connected ??= client.connect();
    await connected;
  };

  const prepare = (input: { requestedTag: string; tier: string }) => {
    validateInput(input);
    const taskQuery = makeTaskQuery(runtime.schema, input.requestedTag, input.tier);
    const compiled = dialect.sqlToQuery(taskQuery);
    return {
      taskQuery,
      sourceSql: compiled.sql,
      executedSql: compiled.sql,
      params: compiled.params.map((value) => String(value)),
    };
  };

  return {
    async investigate(input) {
      await ensureOpen();
      const prepared = prepare(input);
      const result = await db.execute(prepared.taskQuery);
      return {
        rows: result.rows,
        sourceSql: prepared.sourceSql,
        executedSql: prepared.executedSql,
        params: prepared.params,
      };
    },

    async explain(input) {
      await ensureOpen();
      const prepared = prepare(input);
      const result = await db.execute(sql`EXPLAIN (FORMAT JSON) ${prepared.taskQuery}`);
      const firstRow = result.rows[0] as { 'QUERY PLAN'?: unknown } | undefined;
      return {
        sourceSql: prepared.sourceSql,
        executedSql: prepared.executedSql,
        params: prepared.params,
        plan: firstRow?.['QUERY PLAN'],
      };
    },

    async close() {
      if (closed) {
        return;
      }
      closed = true;
      if (connected !== undefined) {
        try {
          await connected;
        } catch {
          return;
        }
      }
      await client.end();
    },
  };
}
