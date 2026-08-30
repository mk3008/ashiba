import { Kysely, PostgresDialect, type Generated } from 'kysely';
import { Pool } from 'pg';
import type { TicketDto } from '../dto.js';
import type { AssignTicketInput, CreateTicketInput, ListTicketsInput, Runtime } from '../types.js';
import { ticketListQuery } from '../query/ticket-read-model.js';
import { applicationError } from '../../application.js';

interface TicketsTable {
  id: Generated<string>; title: string; status: TicketDto['status']; assignee: string | null; priority: number; created_at: Date; metadata: Record<string, unknown>;
}
interface TicketAuditTable { audit_id: Generated<string>; ticket_id: string; action: string; detail: string; created_at: Date; }
export interface Database { tickets: TicketsTable; ticket_audit: TicketAuditTable; }
export interface TicketRow {
  id: string; title: string; status: TicketDto['status']; assignee: string | null; priority: number; createdAt: Date; metadata: Record<string, unknown>;
}
export interface TicketStore {
  list(input?: ListTicketsInput): Promise<TicketDto[]>; get(id: string): Promise<TicketDto | null>; create(input: CreateTicketInput): Promise<TicketDto>; assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }>; close(): Promise<void>;
}

/** Kysely owns all queries and the assignment transaction; pg only supplies its dialect pool. */
export function createKyselyTicketStore(runtime: Runtime): TicketStore {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  const selectedTicket = ['id', 'title', 'status', 'assignee', 'priority', 'created_at as createdAt', 'metadata'] as const;
  return {
    async list(input) {
      const rows = await ticketListQuery(db.selectFrom('tickets').select(selectedTicket), input).execute();
      return rows.map(toTicketDto);
    },
    async get(id) {
      const row = await db.selectFrom('tickets').select(selectedTicket).where('id', '=', id).executeTakeFirst();
      return row === undefined ? null : toTicketDto(row);
    },
    async create(input) {
      const row = await db.insertInto('tickets').values({ title: input.title, status: input.status, assignee: input.assignee, priority: input.priority, created_at: new Date(), metadata: input.metadata ?? {} }).returning(selectedTicket).executeTakeFirstOrThrow();
      return toTicketDto(row);
    },
    async assign(input) {
      return db.transaction().execute(async (trx) => {
        const ticket = await trx.updateTable('tickets').set({ assignee: input.assignee }).where('id', '=', input.id).returning(['id', 'assignee']).executeTakeFirst();
        if (ticket === undefined) throw applicationError('NOT_FOUND', 'Ticket was not found');
        await trx.insertInto('ticket_audit').values({ ticket_id: ticket.id, action: 'assign', detail: JSON.stringify({ assignee: input.assignee }), created_at: new Date() }).execute();
        return { id: String(ticket.id), assignee: ticket.assignee };
      });
    },
    async close() { await db.destroy(); },
  };
}

function toTicketDto(row: TicketRow): TicketDto {
  return { id: String(row.id), title: row.title, status: row.status, assignee: row.assignee, priority: row.priority, createdAt: toIsoTimestamp(row.createdAt), metadata: row.metadata };
}
function toIsoTimestamp(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toISOString();
}
