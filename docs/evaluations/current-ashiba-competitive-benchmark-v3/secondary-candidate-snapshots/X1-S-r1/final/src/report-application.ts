import { Pool } from "pg";
import {
  report,
  reportQuery,
  type ReportArgs,
} from "./generated/queries_sql.js";

export type Dimension = "status" | "assignee" | "tag";
export type Metric = "count" | "priorityTotal";

export interface ReportRequest {
  dimensions: readonly Dimension[];
  metric: Metric;
  includeTagJoin: boolean;
  statuses?: readonly ("open" | "pending" | "closed")[];
  requestedTag?: string;
}

export interface ReportResult {
  rows: readonly Record<string, string | number | null>[];
  sourceSql: string;
  executedSql: string;
  params: readonly unknown[];
}

export interface ReportApplication {
  runReport(input: ReportRequest): Promise<ReportResult>;
  close(): Promise<void>;
}

export interface Runtime {
  connectionString: string;
  schema: string;
}

type ApplicationErrorCode = "VALIDATION" | "APPLICATION_CLOSED";

function applicationError(code: ApplicationErrorCode, message: string): Error & { code: ApplicationErrorCode } {
  return Object.assign(new Error(message), { code });
}

function validateRequest(input: ReportRequest): {
  dimensions: readonly Dimension[];
  metric: Metric;
  includeTagJoin: boolean;
  statuses: readonly string[] | null;
  requestedTag: string | null;
} {
  if (input === null || typeof input !== "object") {
    throw applicationError("VALIDATION", "Report input must be an object");
  }

  const dimensions = input.dimensions;
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    throw applicationError("VALIDATION", "At least one dimension is required");
  }

  const acceptedDimensions = new Set<Dimension>(["status", "assignee", "tag"]);
  const seen = new Set<Dimension>();
  for (const dimension of dimensions) {
    if (!acceptedDimensions.has(dimension) || seen.has(dimension)) {
      throw applicationError("VALIDATION", "Unknown or duplicated dimension");
    }
    seen.add(dimension);
  }

  if (input.metric !== "count" && input.metric !== "priorityTotal") {
    throw applicationError("VALIDATION", "Unknown metric");
  }
  if (typeof input.includeTagJoin !== "boolean") {
    throw applicationError("VALIDATION", "includeTagJoin must be boolean");
  }
  if (seen.has("tag") && !input.includeTagJoin) {
    throw applicationError("VALIDATION", "tag requires includeTagJoin");
  }

  let statuses: readonly string[] | null = null;
  if (input.statuses !== undefined) {
    if (!Array.isArray(input.statuses) || input.statuses.some((status) => status !== "open" && status !== "pending" && status !== "closed")) {
      throw applicationError("VALIDATION", "Unknown status");
    }
    statuses = input.statuses;
  }

  let requestedTag: string | null = null;
  if (input.requestedTag !== undefined) {
    if (typeof input.requestedTag !== "string" || !input.includeTagJoin) {
      throw applicationError("VALIDATION", "requestedTag requires includeTagJoin");
    }
    requestedTag = input.requestedTag;
  }

  return { dimensions, metric: input.metric, includeTagJoin: input.includeTagJoin, statuses, requestedTag };
}

export function createReportApplication(runtime: Runtime): ReportApplication {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async runReport(input: ReportRequest): Promise<ReportResult> {
      if (closed) {
        throw applicationError("APPLICATION_CLOSED", "Application is closed");
      }

      const request = validateRequest(input);
      const args: ReportArgs = {
        includeStatus: request.dimensions.includes("status"),
        includeAssignee: request.dimensions.includes("assignee"),
        includeTag: request.dimensions.includes("tag"),
        metricPriorityTotal: request.metric === "priorityTotal",
        includeTagJoin: request.includeTagJoin,
        // sqlc's generated surface models nullable pg parameters as strings.
        // PostgreSQL receives the actual null values below.
        statuses: request.statuses as unknown as string[],
        requestedTag: request.requestedTag as unknown as string,
        sortFirst: request.dimensions[0] as string,
        sortSecond: (request.dimensions[1] ?? null) as unknown as string,
        sortThird: (request.dimensions[2] ?? null) as unknown as string,
      };
      const generatedRows = await report(pool, args);
      const rows = generatedRows.map((row) => {
        const result: Record<string, string | number | null> = {};
        for (const dimension of request.dimensions) {
          result[dimension] = row[dimension] as string | null;
        }
        result.metric = Number(row.metric);
        return result;
      });

      return {
        rows,
        sourceSql: reportQuery,
        executedSql: reportQuery,
        params: [
          request.dimensions[0],
          request.dimensions[1] ?? null,
          request.dimensions[2] ?? null,
          args.includeStatus,
          args.includeAssignee,
          args.includeTag,
          args.metricPriorityTotal,
          args.includeTagJoin,
          request.statuses,
          request.requestedTag,
        ],
      };
    },

    async close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}

export const createApplication = createReportApplication;
