import { Pool } from "pg";

import {
  investigateCustomers,
  investigateCustomersQuery,
  type InvestigateCustomersRow,
} from "./generated/query_sql.js";

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: "VALIDATION" | "APPLICATION_CLOSED";
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

type InvestigationInput = {
  requestedTag: string;
  tier: string;
};

type ExplainResult = {
  "QUERY PLAN": unknown;
};

function applicationError(code: ApplicationError["code"], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateInput(input: InvestigationInput): readonly string[] {
  if (typeof input?.requestedTag !== "string" || typeof input?.tier !== "string") {
    throw applicationError("VALIDATION", "requestedTag and tier must be strings");
  }
  return [input.requestedTag, input.tier];
}

function toBusinessRow(row: InvestigateCustomersRow): Record<string, unknown> {
  return {
    customer_id: row.customerId,
    display_name: row.displayName,
    region: row.region,
    has_requested_tag: row.hasRequestedTag,
    paid_order_count: row.paidOrderCount,
    paid_total_cents: row.paidTotalCents,
    latest_order_cents: row.latestOrderCents,
    value_band: row.valueBand,
  };
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw applicationError("APPLICATION_CLOSED", "application is closed");
    }
  }

  return {
    async investigate(input) {
      ensureOpen();
      const [requestedTag, tier] = validateInput(input);
      const rows = await investigateCustomers(pool, { requestedTag, tier });
      return {
        rows: rows.map(toBusinessRow),
        sourceSql: investigateCustomersQuery,
        executedSql: investigateCustomersQuery,
        params: [requestedTag, tier],
      };
    },

    async explain(input) {
      ensureOpen();
      const [requestedTag, tier] = validateInput(input);
      const result = await pool.query<ExplainResult>({
        text: `EXPLAIN (FORMAT JSON) ${investigateCustomersQuery}`,
        values: [requestedTag, tier],
      });
      return {
        sourceSql: investigateCustomersQuery,
        executedSql: investigateCustomersQuery,
        params: [requestedTag, tier],
        plan: result.rows[0]?.["QUERY PLAN"],
      };
    },

    async close() {
      if (closePromise !== undefined) {
        return closePromise;
      }
      closed = true;
      closePromise = pool.end();
      return closePromise;
    },
  };
}
