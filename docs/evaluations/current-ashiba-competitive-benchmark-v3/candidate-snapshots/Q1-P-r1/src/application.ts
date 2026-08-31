import postgres from '@prisma/orm-postgres/runtime';
import { defineContract } from '@prisma/orm-postgres/contract-builder';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  investigate(input: { requestedTag: string; tier: string }): Promise<Investigation>;
  explain(input: { requestedTag: string; tier: string }): Promise<Explanation>;
  close(): Promise<void>;
}

export interface Investigation {
  rows: unknown[];
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
}

export interface Explanation {
  sourceSql: string;
  executedSql: string;
  params: readonly string[];
  plan: unknown;
}

type RawRowSpec = Record<string, string | { codecId: string; nullable?: boolean }>;

const queryContract = defineContract({}, () => ({ models: {} }));

const investigationRowSpec = {
  customer_id: 'pg/text@1',
  display_name: 'pg/text@1',
  region: 'pg/text@1',
  has_requested_tag: 'pg/bool@1',
  paid_order_count: 'pg/text@1',
  paid_total_cents: 'pg/text@1',
  latest_order_cents: { codecId: 'pg/text@1', nullable: true },
  value_band: 'pg/text@1',
} satisfies RawRowSpec;

const explainRowSpec = {
  'QUERY PLAN': 'pg/json@1',
} satisfies RawRowSpec;

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function requireText(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw applicationError('VALIDATION', `${name} must be a string`);
  }
  return value;
}

async function collectRows<Row>(result: AsyncIterable<Row>): Promise<Row[]> {
  const rows: Row[] = [];
  for await (const row of result) rows.push(row);
  return rows;
}

function sqlForSchema(schema: string): { sourceSql: string; template: TemplateStringsArray } {
  const namespace = quoteIdentifier(schema);
  const prefix = `WITH ranked_orders AS (
  SELECT
    c.customer_id,
    c.display_name,
    c.region,
    c.tags @> ARRAY[`;
  const betweenParams = `::text]::text[] AS has_requested_tag,
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
  WHERE c.profile->>'tier' = `;
  const suffix = `::text
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
ORDER BY paid_total_cents DESC, customer_id ASC`;
  const template = Object.assign([prefix, betweenParams, suffix], {
    raw: [prefix, betweenParams, suffix],
  }) as TemplateStringsArray;

  return {
    sourceSql: `${prefix}$1${betweenParams}$2${suffix}`,
    template,
  };
}

export function createApplication(runtime: Runtime): Application {
  const db = postgres({ contract: queryContract, url: runtime.connectionString });
  let closed = false;

  const assertOpen = (): void => {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  };

  const detailsFor = (input: { requestedTag: string; tier: string }) => {
    const requestedTag = requireText(input?.requestedTag, 'requestedTag');
    const tier = requireText(input?.tier, 'tier');
    const { sourceSql, template } = sqlForSchema(runtime.schema);
    return { requestedTag, tier, sourceSql, template };
  };

  return {
    async investigate(input): Promise<Investigation> {
      assertOpen();
      const { requestedTag, tier, sourceSql, template } = detailsFor(input);
      const statement = db.raw.sql(template, requestedTag, tier)
        .returnsRow(investigationRowSpec)
        .build();
      const rows = await collectRows(db.runtime().query(statement));
      return { rows, sourceSql, executedSql: sourceSql, params: [requestedTag, tier] };
    },

    async explain(input): Promise<Explanation> {
      assertOpen();
      const { requestedTag, tier, sourceSql, template } = detailsFor(input);
      const explainTemplate = Object.assign([`EXPLAIN (FORMAT JSON) ${template[0]}`, template[1]!, template[2]!], {
        raw: [`EXPLAIN (FORMAT JSON) ${template[0]}`, template[1]!, template[2]!],
      }) as TemplateStringsArray;
      const statement = db.raw.sql(explainTemplate, requestedTag, tier)
        .returnsRow(explainRowSpec)
        .build();
      const rows = await collectRows(db.runtime().query(statement));
      const first = rows[0] as Record<string, unknown> | undefined;
      return {
        sourceSql,
        executedSql: sourceSql,
        params: [requestedTag, tier],
        plan: first?.['QUERY PLAN'],
      };
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await db.close();
    },
  };
}
