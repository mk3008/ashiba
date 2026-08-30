import { Pool } from "pg";
import {
  assignTicket,
  createTicket,
  getTicket,
  insertTicketAudit,
  listTicketsByCreatedAtAsc,
  listTicketsByCreatedAtDesc,
  listTicketsByIdAsc,
  listTicketsByIdDesc,
  listTicketsByPriorityAsc,
  listTicketsByPriorityDesc,
  type ListTicketsParams,
  type TicketRow,
  type TicketStatus,
} from "./generated/queries.js";

export type TicketSort = "id" | "priority" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface Runtime { connectionString: string; schema: string; }
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
export interface ListInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
}
export interface CreateInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}
export interface AssignInput { id: string; assignee: string | null; }
export interface Application {
  list(input?: ListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: CreateInput): Promise<Ticket>;
  assign(input: AssignInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

const statuses = new Set<TicketStatus>(["open", "pending", "closed"]);
const sorts = new Set<TicketSort>(["id", "priority", "createdAt"]);
const directions = new Set<SortDirection>(["asc", "desc"]);

function applicationError(code: ApplicationError["code"], message: string): ApplicationError {
  return Object.assign(new Error(message), { code });
}
function validation(message: string): never { throw applicationError("VALIDATION", message); }
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function positiveId(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) validation(`${name} must be a positive integer string`);
  if (BigInt(value) > 9_223_372_036_854_775_807n) validation(`${name} is outside bigint range`);
  return value;
}
function stringOrNull(value: unknown, name: string): string | null {
  if (value !== null && typeof value !== "string") validation(`${name} must be a string or null`);
  return value;
}
function ticketFromRow(row: TicketRow): Ticket {
  return {
    id: String(row.id), title: row.title, status: row.status, assignee: row.assignee,
    priority: row.priority, createdAt: new Date(row.created_at).toISOString(), metadata: row.metadata,
  };
}
function validMetadata(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) validation("metadata must be an object");
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined || !isRecord(JSON.parse(encoded))) validation("metadata must be JSON-safe");
  } catch { validation("metadata must be JSON-safe"); }
  return value;
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  const assertOpen = (): void => { if (closed) throw applicationError("APPLICATION_CLOSED", "application is closed"); };

  return {
    async list(input: ListInput = {}): Promise<Ticket[]> {
      assertOpen();
      if (!isRecord(input)) validation("list input must be an object");
      const listInput = input as ListInput;
      const status = listInput.status;
      const sort = listInput.sort ?? "id";
      const direction = listInput.direction ?? "asc";
      const offset = listInput.offset ?? 0;
      const limit = listInput.limit ?? 100;
      if (status !== undefined && !statuses.has(status)) validation("unsupported status");
      if (!sorts.has(sort)) validation("unsupported sort");
      if (!directions.has(direction)) validation("unsupported direction");
      if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) validation("offset must be an integer from 0 through 10000");
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) validation("limit must be an integer from 1 through 100");
      const hasAssignee = Object.prototype.hasOwnProperty.call(listInput, "assignee");
      const assignee = hasAssignee ? stringOrNull(listInput.assignee, "assignee") : null;
      const params: ListTicketsParams = {
        status: status ?? null, filterUnassigned: hasAssignee && assignee === null,
        filterAssignee: hasAssignee && assignee !== null, assignee, pageLimit: limit, pageOffset: offset,
      };
      const queries = {
        id: { asc: listTicketsByIdAsc, desc: listTicketsByIdDesc },
        priority: { asc: listTicketsByPriorityAsc, desc: listTicketsByPriorityDesc },
        createdAt: { asc: listTicketsByCreatedAtAsc, desc: listTicketsByCreatedAtDesc },
      } as const;
      return (await queries[sort][direction](pool, params)).map(ticketFromRow);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      assertOpen();
      if (!isRecord(input)) validation("get input must be an object");
      const row = await getTicket(pool, positiveId(input.id, "id"));
      return row === null ? null : ticketFromRow(row);
    },

    async create(input: CreateInput): Promise<Ticket> {
      assertOpen();
      if (!isRecord(input) || typeof input.title !== "string") validation("title must be a string");
      const createInput = input as CreateInput;
      if (!statuses.has(createInput.status)) validation("unsupported status");
      const assignee = stringOrNull(createInput.assignee, "assignee");
      if (!Number.isInteger(createInput.priority) || createInput.priority < 1 || createInput.priority > 5) validation("priority must be an integer from 1 through 5");
      return ticketFromRow(await createTicket(pool, {
        title: createInput.title, status: createInput.status, assignee, priority: createInput.priority,
        metadata: validMetadata(createInput.metadata ?? {}),
      }));
    },

    async assign(input: AssignInput): Promise<{ id: string; assignee: string | null }> {
      assertOpen();
      if (!isRecord(input)) validation("assign input must be an object");
      const id = positiveId(input.id, "id");
      const assignee = stringOrNull(input.assignee, "assignee");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const updated = await assignTicket(client, id, assignee);
        if (updated === null) throw applicationError("NOT_FOUND", "ticket was not found");
        await insertTicketAudit(client, id, JSON.stringify({ assignee }));
        await client.query("COMMIT");
        return { id: String(updated.id), assignee: updated.assignee };
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
        throw error;
      } finally { client.release(); }
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
