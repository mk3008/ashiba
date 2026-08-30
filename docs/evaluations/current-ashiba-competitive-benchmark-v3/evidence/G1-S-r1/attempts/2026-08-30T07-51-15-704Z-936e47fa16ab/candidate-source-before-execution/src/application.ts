import { Pool, type PoolClient } from "pg";
import {
  createTicket,
  getTicket,
  insertTicketAssignAudit,
  listTicketsByCreatedAtAsc,
  listTicketsByCreatedAtDesc,
  listTicketsByIdAsc,
  listTicketsByIdDesc,
  listTicketsByPriorityAsc,
  listTicketsByPriorityDesc,
  updateTicketAssignee,
} from "./generated/queries_sql.js";

export type TicketStatus = "open" | "pending" | "closed";
export type TicketSort = "id" | "priority" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ApplicationError extends Error {
  code: "VALIDATION" | "NOT_FOUND" | "INSUFFICIENT_FUNDS" | "APPLICATION_CLOSED";
}

export interface Application {
  list(input?: {
    status?: TicketStatus;
    assignee?: string | null;
    sort?: TicketSort;
    direction?: SortDirection;
    offset?: number;
    limit?: number;
  }): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: {
    title: string;
    status: TicketStatus;
    assignee: string | null;
    priority: number;
    metadata?: Record<string, unknown>;
  }): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

class CandidateError extends Error implements ApplicationError {
  readonly code: ApplicationError["code"];

  constructor(code: ApplicationError["code"], message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
  }
}

const statuses = new Set<TicketStatus>(["open", "pending", "closed"]);
const sorts = new Set<TicketSort>(["id", "priority", "createdAt"]);
const directions = new Set<SortDirection>(["asc", "desc"]);
const own = Object.prototype.hasOwnProperty;

type TicketRow = {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  priority: number;
  createdAt: Date;
  metadata: unknown;
};

type NormalizedListInput = {
  statusFilter: TicketStatus | null;
  assigneeIsFiltered: boolean;
  assigneeFilter: string | null;
  sort: TicketSort;
  direction: SortDirection;
  offsetValue: number;
  limitValue: number;
};

function validation(message: string): never {
  throw new CandidateError("VALIDATION", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasField(value: Record<string, unknown>, field: string): boolean {
  return own.call(value, field);
}

function positiveId(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) {
    return validation(`${field} must be a positive base-10 integer string`);
  }
  return value;
}

function enumValue<T extends string>(value: unknown, allowed: ReadonlySet<T>, field: string): T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    return validation(`${field} is invalid`);
  }
  return value as T;
}

function nullableString(value: unknown, field: string): string | null {
  if (typeof value !== "string" && value !== null) {
    return validation(`${field} must be a string or null`);
  }
  return value;
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number, field: string): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    return validation(`${field} is out of range`);
  }
  return value;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return validation("metadata must be a JSON object");
  }

  try {
    const serialised = JSON.stringify(value);
    if (serialised === undefined) {
      return validation("metadata must be JSON-safe");
    }
    const parsed: unknown = JSON.parse(serialised);
    if (!isRecord(parsed)) {
      return validation("metadata must be a JSON object");
    }
    return parsed;
  } catch {
    return validation("metadata must be JSON-safe");
  }
}

function normaliseListInput(input: unknown): NormalizedListInput {
  if (input === undefined) {
    return {
      statusFilter: null,
      assigneeIsFiltered: false,
      assigneeFilter: null,
      sort: "id",
      direction: "asc",
      offsetValue: 0,
      limitValue: 100,
    };
  }
  if (!isRecord(input)) {
    return validation("list input must be an object");
  }

  const hasStatus = hasField(input, "status");
  const hasAssignee = hasField(input, "assignee");
  const hasSort = hasField(input, "sort");
  const hasDirection = hasField(input, "direction");

  return {
    statusFilter: hasStatus ? enumValue(input.status, statuses, "status") : null,
    assigneeIsFiltered: hasAssignee,
    assigneeFilter: hasAssignee ? nullableString(input.assignee, "assignee") : null,
    sort: hasSort ? enumValue(input.sort, sorts, "sort") : "id",
    direction: hasDirection ? enumValue(input.direction, directions, "direction") : "asc",
    offsetValue: boundedInteger(input.offset, 0, 0, 10_000, "offset"),
    limitValue: boundedInteger(input.limit, 100, 1, 100, "limit"),
  };
}

function ticketFromRow(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title,
    status: enumValue(row.status, statuses, "database status"),
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    metadata: jsonRecord(row.metadata),
  };
}

function listArgs(input: NormalizedListInput) {
  return {
    statusFilter: input.statusFilter,
    assigneeIsFiltered: input.assigneeIsFiltered,
    assigneeFilter: input.assigneeFilter,
    offsetValue: input.offsetValue,
    limitValue: input.limitValue,
  };
}

async function runList(pool: Pool, input: NormalizedListInput): Promise<TicketRow[]> {
  const args = listArgs(input);
  switch (`${input.sort}:${input.direction}`) {
    case "id:asc": return listTicketsByIdAsc(pool, args);
    case "id:desc": return listTicketsByIdDesc(pool, args);
    case "priority:asc": return listTicketsByPriorityAsc(pool, args);
    case "priority:desc": return listTicketsByPriorityDesc(pool, args);
    case "createdAt:asc": return listTicketsByCreatedAtAsc(pool, args);
    case "createdAt:desc": return listTicketsByCreatedAtDesc(pool, args);
  }
  throw new Error("unreachable list sort selection");
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;

  function requireOpen(): void {
    if (closed) {
      throw new CandidateError("APPLICATION_CLOSED", "application is closed");
    }
  }

  return {
    async list(input): Promise<Ticket[]> {
      requireOpen();
      const normalized = normaliseListInput(input);
      const rows = await runList(pool, normalized);
      return rows.map(ticketFromRow);
    },

    async get(input): Promise<Ticket | null> {
      requireOpen();
      if (!isRecord(input)) {
        return validation("get input must be an object");
      }
      const row = await getTicket(pool, { id: positiveId(input.id, "id") });
      return row === null ? null : ticketFromRow(row);
    },

    async create(input): Promise<Ticket> {
      requireOpen();
      if (!isRecord(input)) {
        return validation("create input must be an object");
      }
      if (typeof input.title !== "string") {
        return validation("title must be a string");
      }
      const priority = boundedInteger(input.priority, 0, 1, 5, "priority");
      const row = await createTicket(pool, {
        title: input.title,
        status: enumValue(input.status, statuses, "status"),
        assignee: nullableString(input.assignee, "assignee"),
        priority,
        metadata: hasField(input, "metadata") ? jsonRecord(input.metadata) : {},
      });
      if (row === null) {
        throw new Error("ticket insert did not return a row");
      }
      return ticketFromRow(row);
    },

    async assign(input): Promise<{ id: string; assignee: string | null }> {
      requireOpen();
      if (!isRecord(input)) {
        return validation("assign input must be an object");
      }
      const id = positiveId(input.id, "id");
      const assignee = nullableString(input.assignee, "assignee");
      const client: PoolClient = await pool.connect();
      try {
        await client.query("BEGIN");
        const updated = await updateTicketAssignee(client, { id, assignee });
        if (updated === null) {
          throw new CandidateError("NOT_FOUND", "ticket was not found");
        }
        await insertTicketAssignAudit(client, { ticketId: id, assignee });
        await client.query("COMMIT");
        return updated;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },

    async close(): Promise<void> {
      if (!closed) {
        closed = true;
        await pool.end();
      }
    },
  };
}

export const __test = { normaliseListInput, positiveId };
