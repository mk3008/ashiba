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

function formatJsonPlan(result: unknown): unknown {
  let plan: unknown;
  if (Array.isArray(result)) {
    plan = result[0];
  } else if (result !== null && typeof result === "object") {
    const row = result as Record<string, unknown>;
    plan = row["QUERY PLAN"] ?? row.query_plan ?? row.queryPlan;
  }

  for (let nesting = 0; nesting < 3; nesting += 1) {
    if (typeof plan === "string") {
      plan = JSON.parse(plan);
      continue;
    }
    if (Array.isArray(plan) && plan.length === 1 && Array.isArray(plan[0])) {
      plan = plan[0];
      continue;
    }
    break;
  }

  if (plan !== null && typeof plan === "object" && !Array.isArray(plan) && "Plan" in plan) {
    return [plan];
  }
  return plan;
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
      const result = await pool.query({
        text: `EXPLAIN (FORMAT JSON) ${investigateCustomersQuery}`,
        values: [requestedTag, tier],
      });
      return {
        sourceSql: investigateCustomersQuery,
        executedSql: investigateCustomersQuery,
        params: [requestedTag, tier],
        plan: formatJsonPlan(result.rows[0]),
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
