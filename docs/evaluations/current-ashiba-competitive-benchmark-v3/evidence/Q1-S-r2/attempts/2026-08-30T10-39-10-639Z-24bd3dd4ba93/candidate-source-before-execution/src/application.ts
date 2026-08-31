import { Pool } from "pg";

import {
  investigate,
  investigateSql,
  type InvestigateRow,
} from "./generated/query_sql.js";

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: "VALIDATION" | "NOT_FOUND" | "INSUFFICIENT_FUNDS" | "APPLICATION_CLOSED";
}

export interface InvestigateInput {
  requestedTag: string;
  tier: string;
}

export interface Application {
  investigate(input: InvestigateInput): Promise<{
    rows: unknown[];
    sourceSql: string;
    executedSql: string;
    params: readonly string[];
  }>;
  explain(input: InvestigateInput): Promise<{
    sourceSql: string;
    executedSql: string;
    params: readonly string[];
    plan: unknown;
  }>;
  close(): Promise<void>;
}

function applicationError(code: ApplicationError["code"], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validateInput(input: InvestigateInput): readonly [string, string] {
  if (
    input === null ||
    typeof input !== "object" ||
    typeof input.requestedTag !== "string" ||
    typeof input.tier !== "string"
  ) {
    throw applicationError("VALIDATION", "requestedTag and tier must be strings");
  }

  return [input.requestedTag, input.tier];
}

function toRows(rows: InvestigateRow[]): unknown[] {
  return rows.map((row) => ({ ...row }));
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
      const rows = await investigate(pool, { requestedTag, tier });
      return {
        rows: toRows(rows),
        sourceSql: investigateSql,
        executedSql: investigateSql,
        params: [requestedTag, tier],
      };
    },

    async explain(input) {
      ensureOpen();
      const [requestedTag, tier] = validateInput(input);
      const result = await pool.query<{ "QUERY PLAN": unknown }>(
        `EXPLAIN (FORMAT JSON) ${investigateSql}`,
        [requestedTag, tier],
      );
      return {
        sourceSql: investigateSql,
        executedSql: investigateSql,
        params: [requestedTag, tier],
        plan: result.rows[0]?.["QUERY PLAN"] ?? [],
      };
    },

    async close() {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
